-- ============================================================
-- BIOPUREX · 0004 · Clientes, abonos y códigos de descuento (fase 3b)
-- - Abonos a cuentas de crédito (bajan el saldo; se aplican a los pedidos más antiguos).
-- - Códigos de descuento en porcentaje (decisión de Cristian, 2026-10-08), opcionalmente
--   para un solo cliente (mayoristas), con mínimo de compra, vencimiento y tope de usos.
-- - crear_pedido acepta un código y lo valida en la base de datos.
-- Ejecutar DESPUÉS de 0003. Verificar con supabase/estado_migraciones.sql.
-- ============================================================

-- ------------------------------------------------------------
-- 1. ABONOS
-- ------------------------------------------------------------
create table public.abonos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.perfiles (id),
  monto numeric(12, 2) not null check (monto > 0),
  metodo text not null check (metodo in ('Transferencia', 'Depósito', 'Cheque', 'Efectivo')),
  referencia text check (referencia is null or char_length(referencia) <= 80),
  creado_por uuid default auth.uid() references public.perfiles (id),
  creado_en timestamptz not null default now()
);

create index abonos_cliente_idx on public.abonos (cliente_id, creado_en desc);

alter table public.abonos enable row level security;
create policy abonos_select on public.abonos for select to authenticated
  using (cliente_id = (select auth.uid()) or (select public.es_admin()));

create or replace function public.admin_registrar_abono(p_cliente uuid, p_monto numeric, p_metodo text, p_referencia text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_saldo numeric(12, 2);
begin
  if not public.es_admin() then raise exception 'Solo el administrador'; end if;
  if p_monto is null or p_monto <= 0 then raise exception 'El monto debe ser mayor que cero'; end if;
  if p_metodo not in ('Transferencia', 'Depósito', 'Cheque', 'Efectivo') then raise exception 'Método no válido'; end if;
  select saldo into v_saldo from public.perfiles where id = p_cliente for update;
  if not found then raise exception 'Cliente no encontrado'; end if;
  if round(p_monto, 2) > v_saldo then raise exception 'El abono supera el saldo (L. %)', v_saldo; end if;
  insert into public.abonos (cliente_id, monto, metodo, referencia)
  values (p_cliente, round(p_monto, 2), p_metodo, nullif(btrim(coalesce(p_referencia, '')), ''));
  update public.perfiles set saldo = saldo - round(p_monto, 2) where id = p_cliente;
end;
$$;

revoke all on function public.admin_registrar_abono(uuid, numeric, text, text) from public, anon;
grant execute on function public.admin_registrar_abono(uuid, numeric, text, text) to authenticated;

-- ------------------------------------------------------------
-- 2. CÓDIGOS DE DESCUENTO (porcentaje)
-- ------------------------------------------------------------
create table public.codigos_descuento (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique check (codigo ~ '^[A-Z0-9_-]{3,30}$'),
  porcentaje numeric(5, 2) not null check (porcentaje > 0 and porcentaje <= 90),
  descripcion text check (descripcion is null or char_length(descripcion) <= 160),
  cliente_id uuid references public.perfiles (id) on delete cascade,
  minimo_compra numeric(12, 2) check (minimo_compra is null or minimo_compra >= 0),
  valido_hasta date,
  usos_maximos int check (usos_maximos is null or usos_maximos > 0),
  usos int not null default 0 check (usos >= 0),
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

-- Solo el admin ve y administra los códigos (los clientes los validan con la función de abajo).
alter table public.codigos_descuento enable row level security;
create policy codigos_admin on public.codigos_descuento for all to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));

-- Valida un código para el usuario actual y un subtotal. Devuelve el porcentaje o un error legible.
create or replace function public._validar_descuento(p_codigo text, p_subtotal numeric, p_usuario uuid)
returns public.codigos_descuento
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.codigos_descuento;
begin
  select * into v from public.codigos_descuento where codigo = upper(btrim(p_codigo));
  if not found or not v.activo then raise exception 'El código no existe o ya no está activo'; end if;
  if v.valido_hasta is not null and v.valido_hasta < (now() at time zone 'America/Tegucigalpa')::date then
    raise exception 'El código venció el %', to_char(v.valido_hasta, 'DD/MM/YYYY');
  end if;
  if v.usos_maximos is not null and v.usos >= v.usos_maximos then raise exception 'El código ya alcanzó su límite de usos'; end if;
  if v.cliente_id is not null and v.cliente_id is distinct from p_usuario then raise exception 'Este código no es válido para tu cuenta'; end if;
  if v.minimo_compra is not null and p_subtotal < v.minimo_compra then
    raise exception 'Este código aplica en compras desde L. %', to_char(v.minimo_compra, 'FM999,999,990.00');
  end if;
  return v;
end;
$$;

revoke all on function public._validar_descuento(text, numeric, uuid) from public, anon, authenticated;

-- Para el checkout: ¿cuánto descuenta este código?
create or replace function public.validar_descuento(p_codigo text, p_subtotal numeric)
returns table (codigo text, porcentaje numeric)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.codigos_descuento;
begin
  if auth.uid() is null then raise exception 'Inicia sesión para usar un código'; end if;
  v := public._validar_descuento(p_codigo, p_subtotal, auth.uid());
  return query select v.codigo, v.porcentaje;
end;
$$;

revoke all on function public.validar_descuento(text, numeric) from public, anon;
grant execute on function public.validar_descuento(text, numeric) to authenticated;

-- ------------------------------------------------------------
-- 3. PEDIDOS CON DESCUENTO
-- ------------------------------------------------------------
alter table public.pedidos
  add column if not exists codigo_descuento text,
  add column if not exists descuento_porcentaje numeric(5, 2),
  add column if not exists descuento numeric(12, 2) not null default 0 check (descuento >= 0);

-- Se reemplaza crear_pedido (nuevo parámetro p_codigo). Se borra la versión anterior para
-- que no queden dos funciones con el mismo nombre.
drop function if exists public.crear_pedido(jsonb, jsonb, jsonb, boolean);

create or replace function public.crear_pedido(
  p_items jsonb, p_contacto jsonb, p_direccion jsonb, p_guardar_direccion boolean default false, p_codigo text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_perfil public.perfiles;
  v_conf public.configuracion;
  v_desc public.codigos_descuento;
  v_pedido uuid;
  v_codigo text;
  v_estado text;
  v_zona text;
  v_envio numeric(12, 2);
  v_subtotal numeric(12, 2) := 0;
  v_descuento numeric(12, 2) := 0;
  v_total numeric(12, 2);
  v_item jsonb;
  v_var record;
  v_cant int;
  v_nombre text := btrim(coalesce(p_contacto ->> 'nombre', ''));
  v_correo text := lower(btrim(coalesce(p_contacto ->> 'correo', '')));
  v_tel text := regexp_replace(coalesce(p_contacto ->> 'telefono', ''), '[^0-9]', '', 'g');
  v_depto text := btrim(coalesce(p_direccion ->> 'departamento', ''));
  v_ciudad text := btrim(coalesce(p_direccion ->> 'ciudad', ''));
  v_colonia text := btrim(coalesce(p_direccion ->> 'colonia', ''));
  v_dir text := btrim(coalesce(p_direccion ->> 'direccion', ''));
  v_ref text := nullif(btrim(coalesce(p_direccion ->> 'referencia', '')), '');
begin
  if v_uid is null then raise exception 'Debes iniciar sesión para comprar'; end if;

  if char_length(v_nombre) not between 2 and 120 then raise exception 'Ingresa tu nombre completo'; end if;
  if v_correo !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then raise exception 'Ingresa un correo válido'; end if;
  if v_tel !~ '^[0-9]{8}$' then raise exception 'El teléfono debe tener 8 dígitos'; end if;
  if v_depto not in ('Atlántida','Choluteca','Colón','Comayagua','Copán','Cortés','El Paraíso','Francisco Morazán',
    'Gracias a Dios','Intibucá','Islas de la Bahía','La Paz','Lempira','Ocotepeque','Olancho','Santa Bárbara','Valle','Yoro')
    then raise exception 'Elige un departamento válido'; end if;
  if char_length(v_ciudad) not between 2 and 80 then raise exception 'Ingresa tu ciudad o municipio'; end if;
  if char_length(v_colonia) not between 2 and 120 then raise exception 'Ingresa tu colonia o barrio'; end if;
  if char_length(v_dir) not between 3 and 200 then raise exception 'Ingresa tu dirección'; end if;
  if v_ref is not null and char_length(v_ref) > 200 then raise exception 'El punto de referencia es muy largo'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Tu carrito está vacío'; end if;
  if jsonb_array_length(p_items) > 50 then raise exception 'Demasiados productos en un pedido'; end if;

  select * into v_perfil from public.perfiles where id = v_uid;
  if not found then raise exception 'Tu cuenta no tiene perfil; vuelve a iniciar sesión'; end if;
  select * into v_conf from public.configuracion where id;
  if not found then raise exception 'La tienda no está configurada'; end if;

  v_zona := case when v_depto = 'Cortés' and lower(v_ciudad) like '%san pedro%' then 'sps' else 'resto' end;
  v_envio := case when v_zona = 'sps' then v_conf.envio_sps else v_conf.envio_resto end;
  v_estado := case when v_perfil.tipo_cliente = 'normal' then 'esperando_pago' else 'confirmado' end;

  insert into public.pedidos (usuario_id, estado, tipo_cliente, contacto_nombre, contacto_correo, contacto_telefono,
    departamento, ciudad, colonia, direccion, referencia, zona_envio, envio, subtotal, total, confirmado_en)
  values (v_uid, v_estado, v_perfil.tipo_cliente, v_nombre, v_correo, v_tel, v_depto, v_ciudad, v_colonia, v_dir, v_ref,
    v_zona, v_envio, 0, 0, case when v_estado = 'confirmado' then now() end)
  returning id, codigo into v_pedido, v_codigo;

  for v_item in
    select e from jsonb_array_elements(p_items) e order by e ->> 'variante_id'
  loop
    v_cant := (v_item ->> 'cantidad')::int;
    if v_cant is null or v_cant not between 1 and 99 then raise exception 'Cantidad no válida'; end if;

    select v.id, v.aroma_id, v.etiqueta, v.img, v.stock, v.stock_apartado, v.activo,
           p.slug, p.nombre, p.tamano, p.precio, p.cotizar, p.activo as producto_activo,
           a.nombre as aroma_nombre
      into v_var
      from public.variantes v
      join public.productos p on p.id = v.producto_id
      left join public.aromas a on a.id = v.aroma_id
     where v.id = (v_item ->> 'variante_id')::uuid
     for update of v;

    if not found or not v_var.activo or not v_var.producto_activo then
      raise exception 'Un producto de tu carrito ya no está disponible';
    end if;
    if v_var.precio is null or v_var.cotizar then
      raise exception '% se vende por cotización', v_var.nombre;
    end if;
    if v_var.stock - v_var.stock_apartado < v_cant then
      raise exception 'No hay suficiente % %', v_var.nombre, coalesce(v_var.aroma_nombre, '');
    end if;

    insert into public.pedido_items (pedido_id, variante_id, producto_slug, producto_nombre, aroma_id, aroma_nombre,
      tamano, img, precio_unitario, cantidad)
    values (v_pedido, v_var.id, v_var.slug, v_var.nombre, v_var.aroma_id, v_var.aroma_nombre,
      v_var.tamano, v_var.img, v_var.precio, v_cant);

    v_subtotal := v_subtotal + v_var.precio * v_cant;
    perform public._mover_stock(v_var.id, case when v_estado = 'esperando_pago' then 'apartado' else 'venta' end,
      v_cant, v_pedido, v_codigo);
  end loop;

  -- Código de descuento: se valida aquí (no se confía en el cálculo del navegador).
  if nullif(btrim(coalesce(p_codigo, '')), '') is not null then
    v_desc := public._validar_descuento(p_codigo, v_subtotal, v_uid);
    perform 1 from public.codigos_descuento where id = v_desc.id for update;
    v_descuento := round(v_subtotal * v_desc.porcentaje / 100, 2);
    update public.codigos_descuento set usos = usos + 1 where id = v_desc.id;
  end if;

  v_total := v_subtotal - v_descuento + v_envio;
  update public.pedidos
     set subtotal = v_subtotal, descuento = v_descuento, total = v_total,
         codigo_descuento = v_desc.codigo, descuento_porcentaje = v_desc.porcentaje
   where id = v_pedido;

  if v_perfil.tipo_cliente = 'credito' then
    update public.perfiles set saldo = saldo + v_total where id = v_uid;
  end if;

  update public.perfiles
     set nombre = case when nombre = '' then v_nombre else nombre end,
         telefono = coalesce(telefono, v_tel)
   where id = v_uid;

  if p_guardar_direccion then
    insert into public.direcciones (usuario_id, etiqueta, nombre, telefono, departamento, ciudad, colonia, direccion,
      referencia, predeterminada)
    values (v_uid, 'Casa', v_nombre, v_tel, v_depto, v_ciudad, v_colonia, v_dir, v_ref,
      not exists (select 1 from public.direcciones where usuario_id = v_uid));
  end if;

  return v_codigo;
end;
$$;

revoke all on function public.crear_pedido(jsonb, jsonb, jsonb, boolean, text) from public, anon;
grant execute on function public.crear_pedido(jsonb, jsonb, jsonb, boolean, text) to authenticated;

-- Cancelar devuelve el uso del código de descuento.
create or replace function public.admin_cancelar_pedido(p_pedido uuid, p_motivo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ped public.pedidos;
  v_it record;
begin
  if not public.es_admin() then raise exception 'Solo el administrador'; end if;
  if char_length(btrim(coalesce(p_motivo, ''))) < 3 then raise exception 'Escribe el motivo de la cancelación'; end if;
  select * into v_ped from public.pedidos where id = p_pedido for update;
  if not found then raise exception 'Pedido no encontrado'; end if;
  if v_ped.estado in ('entregado', 'cancelado') then raise exception 'Este pedido ya no se puede cancelar'; end if;
  for v_it in select variante_id, cantidad from public.pedido_items where pedido_id = p_pedido order by variante_id loop
    if v_ped.estado in ('esperando_pago', 'pago_en_revision') then
      perform public._mover_stock(v_it.variante_id, 'liberacion', v_it.cantidad, p_pedido, v_ped.codigo);
    else
      perform public._mover_stock(v_it.variante_id, 'devolucion', v_it.cantidad, p_pedido, v_ped.codigo);
    end if;
  end loop;
  if v_ped.tipo_cliente = 'credito' and v_ped.estado <> 'esperando_pago' then
    update public.perfiles set saldo = saldo - v_ped.total where id = v_ped.usuario_id;
  end if;
  if v_ped.codigo_descuento is not null then
    update public.codigos_descuento set usos = greatest(usos - 1, 0) where codigo = v_ped.codigo_descuento;
  end if;
  update public.pedidos set estado = 'cancelado', cancelado_en = now(), motivo_cancelacion = btrim(p_motivo) where id = p_pedido;
end;
$$;
