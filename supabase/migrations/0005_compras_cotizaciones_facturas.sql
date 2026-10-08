-- ============================================================
-- BIOPUREX · 0005 · Compras, proveedores, cotizaciones, facturas y datos de la empresa (fase 3c)
-- - Configuración: datos del emisor (razón social, RTN, dirección…) para facturas y cotizaciones.
-- - Proveedores y compras: al recibir una compra, cada línea entra al inventario (kardex) y
--   actualiza el costo del producto con el último costo.
-- - Cotizaciones imprimibles que se convierten en pedido aplicando la regla del cliente.
-- - Facturas SIN CAI (decisión de Cristian): numeración interna FAC-000001, RTN, ISV 15 %.
-- Ejecutar DESPUÉS de 0004. Verificar con supabase/estado_migraciones.sql.
-- Se puede volver a correr sin problema (es idempotente).
-- ============================================================

set lock_timeout = '10s';

-- ------------------------------------------------------------
-- 1. DATOS DE LA EMPRESA (valores de ejemplo: cámbialos en el panel → Configuración)
-- ------------------------------------------------------------
alter table public.configuracion
  add column if not exists razon_social text not null default 'BIOPUREX',
  add column if not exists rtn_emisor text check (rtn_emisor is null or rtn_emisor ~ '^[0-9]{14}$'),
  add column if not exists direccion_emisor text not null default 'San Pedro Sula, Cortés, Honduras',
  add column if not exists telefono_emisor text not null default '8936-1277',
  add column if not exists correo_emisor text not null default 'mibiopurex@gmail.com';

-- ------------------------------------------------------------
-- 2. PROVEEDORES Y COMPRAS
-- ------------------------------------------------------------
create table if not exists public.proveedores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(nombre) between 2 and 120),
  rtn text check (rtn is null or rtn ~ '^[0-9]{14}$'),
  contacto text check (contacto is null or char_length(contacto) <= 120),
  telefono text check (telefono is null or telefono ~ '^[0-9]{8}$'),
  correo text check (correo is null or char_length(correo) <= 120),
  direccion text check (direccion is null or char_length(direccion) <= 200),
  ciudad text check (ciudad is null or char_length(ciudad) <= 80),
  condiciones text not null default 'Contado' check (char_length(condiciones) <= 60),
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

create sequence if not exists public.compras_numero_seq start 1;

create table if not exists public.compras (
  id uuid primary key default gen_random_uuid(),
  numero bigint not null unique default nextval('public.compras_numero_seq'),
  codigo text generated always as ('CMP-' || lpad(numero::text, 4, '0')) stored,
  proveedor_id uuid not null references public.proveedores (id),
  factura_proveedor text check (factura_proveedor is null or char_length(factura_proveedor) <= 40),
  fecha date not null default (now() at time zone 'America/Tegucigalpa')::date,
  estado text not null default 'borrador' check (estado in ('borrador', 'recibida')),
  notas text check (notas is null or char_length(notas) <= 300),
  creado_en timestamptz not null default now(),
  recibida_en timestamptz
);

create table if not exists public.compra_items (
  id uuid primary key default gen_random_uuid(),
  compra_id uuid not null references public.compras (id) on delete cascade,
  variante_id uuid not null references public.variantes (id),
  cantidad int not null check (cantidad between 1 and 100000),
  costo_unitario numeric(12, 2) not null check (costo_unitario >= 0),
  total numeric(12, 2) generated always as (cantidad * costo_unitario) stored
);

create index if not exists compra_items_compra_idx on public.compra_items (compra_id);

alter table public.proveedores enable row level security;
alter table public.compras enable row level security;
alter table public.compra_items enable row level security;
drop policy if exists proveedores_admin on public.proveedores;
create policy proveedores_admin on public.proveedores for all to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));
drop policy if exists compras_admin on public.compras;
create policy compras_admin on public.compras for all to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));
drop policy if exists compra_items_admin on public.compra_items;
create policy compra_items_admin on public.compra_items for all to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));

-- Una compra recibida ya no se edita (el inventario ya se movió).
create or replace function public.proteger_compra()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') and old.estado = 'recibida' then
    raise exception 'Una compra recibida no se puede modificar';
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function public.proteger_compra_items()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_compra uuid := case when tg_op = 'DELETE' then old.compra_id else new.compra_id end;
begin
  if current_user in ('authenticated', 'anon')
     and exists (select 1 from public.compras c where c.id = v_compra and c.estado = 'recibida') then
    raise exception 'Una compra recibida no se puede modificar';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_proteger_compra on public.compras;
create trigger trg_proteger_compra before update or delete on public.compras
  for each row execute function public.proteger_compra();
drop trigger if exists trg_proteger_compra_items on public.compra_items;
create trigger trg_proteger_compra_items before insert or update or delete on public.compra_items
  for each row execute function public.proteger_compra_items();

create or replace function public.admin_recibir_compra(p_compra uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_c public.compras;
  v_it record;
begin
  if not public.es_admin() then raise exception 'Solo el administrador'; end if;
  select * into v_c from public.compras where id = p_compra for update;
  if not found then raise exception 'Compra no encontrada'; end if;
  if v_c.estado <> 'borrador' then raise exception 'Esta compra ya fue recibida'; end if;
  if not exists (select 1 from public.compra_items where compra_id = p_compra) then
    raise exception 'Agrega al menos una línea';
  end if;
  for v_it in
    select ci.variante_id, ci.cantidad, ci.costo_unitario, v.producto_id
      from public.compra_items ci join public.variantes v on v.id = ci.variante_id
     where ci.compra_id = p_compra order by ci.variante_id
  loop
    perform public._mover_stock(v_it.variante_id, 'entrada', v_it.cantidad, null, v_c.codigo);
    update public.movimientos_inventario set nota = 'Compra a proveedor'
     where id = (select id from public.movimientos_inventario where variante_id = v_it.variante_id order by creado_en desc limit 1);
    -- Último costo de compra = costo del producto (para valorizar inventario).
    update public.productos set costo = v_it.costo_unitario where id = v_it.producto_id;
  end loop;
  update public.compras set estado = 'recibida', recibida_en = now() where id = p_compra;
end;
$$;

revoke all on function public.admin_recibir_compra(uuid) from public, anon;
grant execute on function public.admin_recibir_compra(uuid) to authenticated;

-- ------------------------------------------------------------
-- 3. PEDIDOS: núcleo reutilizable (checkout del cliente y cotizaciones del admin)
-- ------------------------------------------------------------
-- Núcleo de crear pedido para un usuario dado (uso interno; mismo cuerpo que 0004).
create or replace function public._crear_pedido(
  p_uid uuid, p_items jsonb, p_contacto jsonb, p_direccion jsonb, p_guardar_direccion boolean, p_codigo text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := p_uid;
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

revoke all on function public._crear_pedido(uuid, jsonb, jsonb, jsonb, boolean, text) from public, anon, authenticated;

create or replace function public.crear_pedido(
  p_items jsonb, p_contacto jsonb, p_direccion jsonb, p_guardar_direccion boolean default false, p_codigo text default null
)
returns text
language sql
security definer
set search_path = ''
as $$
  select public._crear_pedido(auth.uid(), p_items, p_contacto, p_direccion, p_guardar_direccion, p_codigo);
$$;

revoke all on function public.crear_pedido(jsonb, jsonb, jsonb, boolean, text) from public, anon;
grant execute on function public.crear_pedido(jsonb, jsonb, jsonb, boolean, text) to authenticated;

-- ------------------------------------------------------------
-- 4. COTIZACIONES
-- ------------------------------------------------------------
create sequence if not exists public.cotizaciones_numero_seq start 1;

create table if not exists public.cotizaciones (
  id uuid primary key default gen_random_uuid(),
  numero bigint not null unique default nextval('public.cotizaciones_numero_seq'),
  codigo text generated always as ('COT-' || lpad(numero::text, 4, '0')) stored,
  cliente_id uuid not null references public.perfiles (id),
  vigencia_dias int not null default 15 check (vigencia_dias between 1 and 90),
  valida_hasta date not null,
  notas text check (notas is null or char_length(notas) <= 500),
  estado text not null default 'emitida' check (estado in ('emitida', 'convertida')),
  pedido_id uuid references public.pedidos (id),
  total numeric(12, 2) not null default 0,
  creado_en timestamptz not null default now()
);

create table if not exists public.cotizacion_items (
  id uuid primary key default gen_random_uuid(),
  cotizacion_id uuid not null references public.cotizaciones (id) on delete cascade,
  variante_id uuid not null references public.variantes (id),
  descripcion text not null,
  sku text not null,
  cantidad int not null check (cantidad between 1 and 99),
  precio_unitario numeric(12, 2) not null check (precio_unitario >= 0),
  total numeric(12, 2) generated always as (cantidad * precio_unitario) stored
);

create index if not exists cotizacion_items_idx on public.cotizacion_items (cotizacion_id);

alter table public.cotizaciones enable row level security;
alter table public.cotizacion_items enable row level security;
drop policy if exists cotizaciones_admin on public.cotizaciones;
create policy cotizaciones_admin on public.cotizaciones for all to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));
drop policy if exists cotizacion_items_admin on public.cotizacion_items;
create policy cotizacion_items_admin on public.cotizacion_items for all to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));

-- Convierte una cotización en pedido del cliente (aplica su regla: Normal / Crédito / Contra entrega).
-- Usa la dirección predeterminada del cliente y los precios vigentes.
create or replace function public.admin_convertir_cotizacion(p_cotizacion uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_q public.cotizaciones;
  v_p public.perfiles;
  v_d public.direcciones;
  v_items jsonb;
  v_codigo text;
begin
  if not public.es_admin() then raise exception 'Solo el administrador'; end if;
  select * into v_q from public.cotizaciones where id = p_cotizacion for update;
  if not found then raise exception 'Cotización no encontrada'; end if;
  if v_q.estado = 'convertida' then raise exception 'Esta cotización ya se convirtió en pedido'; end if;
  if v_q.valida_hasta < (now() at time zone 'America/Tegucigalpa')::date then
    raise exception 'La cotización está vencida: renueva su vigencia primero';
  end if;
  select * into v_p from public.perfiles where id = v_q.cliente_id;
  select * into v_d from public.direcciones where usuario_id = v_q.cliente_id order by predeterminada desc, creado_en limit 1;
  if v_d.id is null then raise exception 'El cliente no tiene una dirección guardada. Pídele que agregue una en Mi cuenta.'; end if;
  select jsonb_agg(jsonb_build_object('variante_id', variante_id, 'cantidad', cantidad)) into v_items
    from public.cotizacion_items where cotizacion_id = p_cotizacion;
  v_codigo := public._crear_pedido(
    v_q.cliente_id,
    v_items,
    jsonb_build_object('nombre', coalesce(nullif(v_p.nombre, ''), v_d.nombre), 'correo', v_p.correo, 'telefono', coalesce(v_p.telefono, v_d.telefono)),
    jsonb_build_object('departamento', v_d.departamento, 'ciudad', v_d.ciudad, 'colonia', v_d.colonia, 'direccion', v_d.direccion, 'referencia', v_d.referencia),
    false,
    null
  );
  update public.cotizaciones
     set estado = 'convertida', pedido_id = (select id from public.pedidos where codigo = v_codigo)
   where id = p_cotizacion;
  return v_codigo;
end;
$$;

revoke all on function public.admin_convertir_cotizacion(uuid) from public, anon;
grant execute on function public.admin_convertir_cotizacion(uuid) to authenticated;

-- ------------------------------------------------------------
-- 5. FACTURAS (sin CAI)
-- ------------------------------------------------------------
create sequence if not exists public.facturas_numero_seq start 1;

create table if not exists public.facturas (
  id uuid primary key default gen_random_uuid(),
  numero bigint not null unique default nextval('public.facturas_numero_seq'),
  codigo text generated always as ('FAC-' || lpad(numero::text, 6, '0')) stored,
  pedido_id uuid not null references public.pedidos (id),
  cliente_id uuid not null references public.perfiles (id),
  cliente_nombre text not null,
  cliente_rtn text,
  cliente_direccion text not null,
  condicion text not null,
  emisor jsonb not null,
  subtotal numeric(12, 2) not null,
  descuento numeric(12, 2) not null default 0,
  envio numeric(12, 2) not null default 0,
  gravado numeric(12, 2) not null,
  isv numeric(12, 2) not null,
  total numeric(12, 2) not null,
  estado text not null default 'emitida' check (estado in ('emitida', 'anulada')),
  motivo_anulacion text,
  emitida_en timestamptz not null default now(),
  anulada_en timestamptz
);

-- Un pedido tiene a lo sumo una factura vigente.
create unique index if not exists facturas_pedido_vigente on public.facturas (pedido_id) where estado = 'emitida';

alter table public.facturas enable row level security;
drop policy if exists facturas_select on public.facturas;
create policy facturas_select on public.facturas for select to authenticated
  using (cliente_id = (select auth.uid()) or (select public.es_admin()));

create or replace function public.admin_emitir_factura(p_pedido uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_p public.pedidos;
  v_perfil public.perfiles;
  v_conf public.configuracion;
  v_codigo text;
  v_gravado numeric(12, 2);
begin
  if not public.es_admin() then raise exception 'Solo el administrador'; end if;
  select * into v_p from public.pedidos where id = p_pedido for update;
  if not found then raise exception 'Pedido no encontrado'; end if;
  if v_p.estado not in ('confirmado', 'enviado', 'entregado') then
    raise exception 'Solo se factura un pedido confirmado';
  end if;
  if exists (select 1 from public.facturas where pedido_id = p_pedido and estado = 'emitida') then
    raise exception 'Este pedido ya tiene factura';
  end if;
  select * into v_perfil from public.perfiles where id = v_p.usuario_id;
  select * into v_conf from public.configuracion where id;
  -- Precios con ISV incluido: gravado = total / 1.15.
  v_gravado := round(v_p.total / 1.15, 2);
  insert into public.facturas (pedido_id, cliente_id, cliente_nombre, cliente_rtn, cliente_direccion, condicion, emisor,
    subtotal, descuento, envio, gravado, isv, total)
  values (
    p_pedido, v_p.usuario_id, v_p.contacto_nombre, v_perfil.rtn,
    concat_ws(', ', v_p.direccion, v_p.colonia, v_p.ciudad, v_p.departamento),
    case v_p.tipo_cliente when 'credito' then 'Crédito' when 'contra_entrega' then 'Contado · contra entrega' else 'Contado · transferencia' end,
    jsonb_build_object('razon', v_conf.razon_social, 'rtn', v_conf.rtn_emisor, 'direccion', v_conf.direccion_emisor,
      'telefono', v_conf.telefono_emisor, 'correo', v_conf.correo_emisor),
    v_p.subtotal, v_p.descuento, v_p.envio, v_gravado, v_p.total - v_gravado, v_p.total
  )
  returning codigo into v_codigo;
  return v_codigo;
end;
$$;

create or replace function public.admin_anular_factura(p_factura uuid, p_motivo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.es_admin() then raise exception 'Solo el administrador'; end if;
  if char_length(btrim(coalesce(p_motivo, ''))) < 3 then raise exception 'Escribe el motivo de la anulación'; end if;
  update public.facturas set estado = 'anulada', anulada_en = now(), motivo_anulacion = btrim(p_motivo)
   where id = p_factura and estado = 'emitida';
  if not found then raise exception 'La factura no existe o ya está anulada'; end if;
end;
$$;

revoke all on function public.admin_emitir_factura(uuid) from public, anon;
revoke all on function public.admin_anular_factura(uuid, text) from public, anon;
grant execute on function public.admin_emitir_factura(uuid) to authenticated;
grant execute on function public.admin_anular_factura(uuid, text) to authenticated;
