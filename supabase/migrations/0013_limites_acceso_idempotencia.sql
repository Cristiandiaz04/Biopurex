-- ============================================================
-- BIOPUREX · 0013 · Límite de intentos de acceso y pedidos sin duplicados
-- Auditoría antes del lanzamiento (2026-10-08):
-- 1. Login, registro y recuperar contraseña: límite de intentos por IP y por correo.
--    Supabase limita por IP, pero todas las solicitudes le llegan desde los servidores de Vercel,
--    así que su límite no distingue a un atacante de los demás clientes. La app guarda aquí cada
--    intento con una huella (HMAC con un secreto del servidor), nunca el correo ni la IP en claro.
-- 2. Pedidos idempotentes: el checkout manda una clave única por intento de compra; si llega dos
--    veces (doble clic, reintento de red) se devuelve el mismo pedido en vez de crear otro.
-- Se puede volver a correr sin problema (es idempotente).
-- Ejecutar DESPUÉS de 0012, en las DOS bases (prueba y producción).
-- ============================================================

set lock_timeout = '10s';

-- ------------------------------------------------------------
-- 1. LÍMITE DE INTENTOS DE ACCESO
-- ------------------------------------------------------------
create table if not exists public.intentos_acceso (
  id bigint generated always as identity primary key,
  clave text not null check (char_length(clave) between 8 and 120),
  creado_en timestamptz not null default now()
);
create index if not exists intentos_acceso_clave_idx on public.intentos_acceso (clave, creado_en desc);
alter table public.intentos_acceso enable row level security; -- sin políticas: solo la función
revoke all on public.intentos_acceso from anon, authenticated;

-- Registra un intento y dice si todavía se permite (máximo p_max en los últimos p_minutos).
-- La clave ya viene como huella (HMAC) desde el servidor de la app.
create or replace function public.permitir_intento(p_clave text, p_max int, p_minutos int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n int;
begin
  if p_clave is null or char_length(p_clave) not between 8 and 120 then return false; end if;
  if p_max not between 1 and 1000 or p_minutos not between 1 and 1440 then return false; end if;
  select count(*) into v_n from public.intentos_acceso
   where clave = p_clave and creado_en > now() - make_interval(mins => p_minutos);
  if v_n >= p_max then return false; end if;
  insert into public.intentos_acceso (clave) values (p_clave);
  -- Limpieza: lo de más de un día ya no sirve.
  if random() < 0.02 then delete from public.intentos_acceso where creado_en < now() - interval '1 day'; end if;
  return true;
end;
$$;

revoke all on function public.permitir_intento(text, int, int) from public;
grant execute on function public.permitir_intento(text, int, int) to anon, authenticated;

-- ------------------------------------------------------------
-- 2. PEDIDOS IDEMPOTENTES
-- ------------------------------------------------------------
alter table public.pedidos add column if not exists clave_idempotencia uuid;
create unique index if not exists pedidos_idempotencia_uidx on public.pedidos (usuario_id, clave_idempotencia)
  where clave_idempotencia is not null;

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
  v_zona_rec record;
  v_pedido uuid;
  v_codigo text;
  v_estado text;
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
  -- Clave única del intento de compra (la genera el checkout): un doble envío devuelve el mismo pedido.
  v_clave uuid := case when coalesce(p_contacto ->> 'clave', '') ~* '^[0-9a-f-]{36}$' then (p_contacto ->> 'clave')::uuid end;
  v_existente text;
  v_depto text := btrim(coalesce(p_direccion ->> 'departamento', ''));
  v_muni text := btrim(coalesce(p_direccion ->> 'municipio', ''));
  v_ciudad text := btrim(coalesce(p_direccion ->> 'ciudad', ''));
  v_colonia text := btrim(coalesce(p_direccion ->> 'colonia', ''));
  v_dir text := btrim(coalesce(p_direccion ->> 'direccion', ''));
  v_ref text := nullif(btrim(coalesce(p_direccion ->> 'referencia', '')), '');
begin
  if v_uid is null then raise exception 'Debes iniciar sesión para comprar'; end if;
  -- Pedido repetido (doble clic, red lenta, reintento): se devuelve el que ya se creó.
  if v_clave is not null then
    select codigo into v_existente from public.pedidos where usuario_id = v_uid and clave_idempotencia = v_clave;
    if found then return v_existente; end if;
  end if;
  if auth.uid() = v_uid and (
    select count(*) from public.pedidos where usuario_id = v_uid and creado_en > now() - interval '1 hour'
  ) >= 10 then
    raise exception 'Hiciste muchos pedidos en poco tiempo. Espera un momento o escríbenos.';
  end if;

  if char_length(v_nombre) not between 2 and 120 then raise exception 'Ingresa tu nombre completo'; end if;
  if v_correo !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then raise exception 'Ingresa un correo válido'; end if;
  if v_tel !~ '^[0-9]{8}$' then raise exception 'El teléfono debe tener 8 dígitos'; end if;
  if char_length(v_colonia) not between 2 and 120 then raise exception 'Ingresa tu colonia o barrio'; end if;
  if char_length(v_dir) not between 3 and 200 then raise exception 'Ingresa tu dirección'; end if;
  if v_ref is not null and char_length(v_ref) > 200 then raise exception 'El punto de referencia es muy largo'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Tu carrito está vacío'; end if;
  if jsonb_array_length(p_items) > 50 then raise exception 'Demasiados productos en un pedido'; end if;

  -- Zona de entrega: el municipio tiene que estar en la lista del admin (activo). La ciudad, aldea o
  -- caserío la escribe el cliente. Las direcciones guardadas sin municipio se deducen por la ciudad
  -- (nombre del municipio o una ciudad que el admin había cargado en él).
  if char_length(v_ciudad) not between 2 and 80 then raise exception 'Escribe tu ciudad, aldea o caserío'; end if;
  select m.nombre as municipio, m.costo_envio
    into v_zona_rec
    from public.municipios m
   where m.activo
     and m.departamento = v_depto
     and (
       (v_muni <> '' and lower(m.nombre) = lower(v_muni))
       or (v_muni = '' and (lower(m.nombre) = lower(v_ciudad)
             or exists (select 1 from public.ciudades c where c.municipio_id = m.id and lower(c.nombre) = lower(v_ciudad))))
     )
   order by m.nombre
   limit 1;
  if not found then
    raise exception 'Por ahora no entregamos en ese municipio. Elige uno de la lista.';
  end if;
  v_muni := v_zona_rec.municipio;

  select * into v_perfil from public.perfiles where id = v_uid;
  if not found then raise exception 'Tu cuenta no tiene perfil; vuelve a iniciar sesión'; end if;
  select * into v_conf from public.configuracion where id;
  if not found then raise exception 'La tienda no está configurada'; end if;

  v_estado := case when v_perfil.tipo_cliente = 'normal' then 'esperando_pago' else 'confirmado' end;

  insert into public.pedidos (clave_idempotencia, usuario_id, estado, tipo_cliente, contacto_nombre, contacto_correo, contacto_telefono,
    departamento, municipio, ciudad, colonia, direccion, referencia, zona_envio, envio, subtotal, total, confirmado_en)
  values (v_clave, v_uid, v_estado, v_perfil.tipo_cliente, v_nombre, v_correo, v_tel, v_depto, v_muni, v_ciudad, v_colonia, v_dir, v_ref,
    case when v_depto = 'Cortés' and lower(v_muni) = 'san pedro sula' then 'sps' else 'resto' end,
    0, 0, 0, case when v_estado = 'confirmado' then now() end)
  on conflict (usuario_id, clave_idempotencia) where clave_idempotencia is not null do nothing
  returning id, codigo into v_pedido, v_codigo;
  -- Dos envíos al mismo tiempo: el segundo espera al primero y devuelve ese pedido.
  if v_pedido is null then
    select codigo into v_existente from public.pedidos where usuario_id = v_uid and clave_idempotencia = v_clave;
    return v_existente;
  end if;

  for v_item in
    select e from jsonb_array_elements(p_items) e order by e ->> 'variante_id'
  loop
    v_cant := (v_item ->> 'cantidad')::int;
    if v_cant is null or v_cant not between 1 and 999 then raise exception 'Cantidad no válida'; end if;

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
    -- Sin límite de stock (pedido de Cristian): lo que falte se produce; el dueño revisa antes de confirmar.

    insert into public.pedido_items (pedido_id, variante_id, producto_slug, producto_nombre, aroma_id, aroma_nombre,
      tamano, img, precio_unitario, cantidad)
    values (v_pedido, v_var.id, v_var.slug, v_var.nombre, v_var.aroma_id, v_var.aroma_nombre,
      v_var.tamano, v_var.img, v_var.precio, v_cant);

    v_subtotal := v_subtotal + v_var.precio * v_cant;
    perform public._mover_stock(v_var.id, case when v_estado = 'esperando_pago' then 'apartado' else 'venta' end,
      v_cant, v_pedido, v_codigo);
  end loop;

  -- Envío del municipio; gratis si la compra pasa del monto configurado.
  v_envio := case when v_conf.envio_gratis_desde is not null and v_subtotal > v_conf.envio_gratis_desde
                  then 0 else v_zona_rec.costo_envio end;

  -- Código de descuento: se valida aquí (no se confía en el cálculo del navegador).
  if nullif(btrim(coalesce(p_codigo, '')), '') is not null then
    -- Solo códigos validados por este cliente en la última hora (validar_descuento limita los
    -- intentos): así no se pueden adivinar códigos probando directo con crear_pedido.
    if auth.uid() = v_uid and not exists (
      select 1 from public.intentos_descuento i
        join public.codigos_descuento c on c.id = i.codigo_id
       where i.usuario_id = v_uid and i.exito and c.codigo = upper(btrim(p_codigo))
         and i.creado_en > now() - interval '1 hour'
    ) then
      raise exception 'Aplica el código de descuento antes de confirmar';
    end if;
    v_desc := public._validar_descuento(p_codigo, v_subtotal, v_uid);
    perform 1 from public.codigos_descuento where id = v_desc.id for update;
    v_descuento := round(v_subtotal * v_desc.porcentaje / 100, 2);
    update public.codigos_descuento set usos = usos + 1 where id = v_desc.id;
  end if;

  v_total := v_subtotal - v_descuento + v_envio;
  update public.pedidos
     set subtotal = v_subtotal, descuento = v_descuento, envio = v_envio, total = v_total,
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
    insert into public.direcciones (usuario_id, etiqueta, nombre, telefono, departamento, municipio, ciudad, colonia,
      direccion, referencia, predeterminada)
    values (v_uid, 'Casa', v_nombre, v_tel, v_depto, v_muni, v_ciudad, v_colonia, v_dir, v_ref,
      not exists (select 1 from public.direcciones where usuario_id = v_uid));
  end if;

  return v_codigo;
end;
$$;

revoke all on function public._crear_pedido(uuid, jsonb, jsonb, jsonb, boolean, text) from public, anon, authenticated;
comment on function public._crear_pedido(uuid, jsonb, jsonb, jsonb, boolean, text) is 'v0013: pedidos idempotentes';
