-- ============================================================
-- BIOPUREX · 0012 · Seguridad, índices y tarjetas fijas del inicio
-- Auditoría (2026-10-08):
-- 1. Permisos: anon no escribe en ninguna tabla y nadie puede TRUNCATE (TRUNCATE ignora RLS).
-- 2. Códigos de descuento: máximo 10 intentos fallidos cada 15 minutos por cliente, y
--    crear_pedido solo acepta códigos validados antes (no se pueden adivinar).
-- 3. Límites de abuso: 10 pedidos por hora y 30 mensajes de chat cada 10 minutos por cliente.
-- 4. Índices en todas las llaves foráneas (consultas y borrados más rápidos).
-- 5. Inicio: "Producto estrella", "Categorías" y "Explora por aroma" pasan a ser tarjetas del
--    editor (se pueden ocultar y ordenar).
-- Se puede volver a correr sin problema (es idempotente).
-- Ejecutar DESPUÉS de 0011. Verificar con supabase/estado_migraciones.sql.
-- ============================================================

set lock_timeout = '10s';

-- ------------------------------------------------------------
-- 1. PERMISOS
-- ------------------------------------------------------------
revoke insert, update, delete, truncate, references, trigger on all tables in schema public from anon;
revoke truncate, references, trigger on all tables in schema public from authenticated;
alter default privileges in schema public revoke insert, update, delete, truncate, references, trigger on tables from anon;
alter default privileges in schema public revoke truncate, references, trigger on tables from authenticated;

-- ------------------------------------------------------------
-- 2. CÓDIGOS DE DESCUENTO: intentos limitados
-- ------------------------------------------------------------
create table if not exists public.intentos_descuento (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references public.perfiles (id) on delete cascade,
  codigo_id uuid references public.codigos_descuento (id) on delete cascade,
  exito boolean not null,
  creado_en timestamptz not null default now()
);
create index if not exists intentos_descuento_usuario_idx on public.intentos_descuento (usuario_id, creado_en desc);
create index if not exists intentos_descuento_codigo_idx on public.intentos_descuento (codigo_id);
-- Sin políticas: solo lo usan las funciones del sistema.
alter table public.intentos_descuento enable row level security;
revoke all on public.intentos_descuento from anon, authenticated;

-- Cambia lo que devuelve (agrega "error"), por eso se borra antes.
drop function if exists public.validar_descuento(text, numeric);
create function public.validar_descuento(p_codigo text, p_subtotal numeric)
returns table (codigo text, porcentaje numeric, error text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v public.codigos_descuento;
  v_error text;
begin
  if v_uid is null then raise exception 'Inicia sesión para usar un código'; end if;
  if (select count(*) from public.intentos_descuento
       where usuario_id = v_uid and not exito and creado_en > now() - interval '15 minutes') >= 10 then
    return query select null::text, null::numeric, 'Demasiados intentos. Espera unos minutos y vuelve a probar.'::text;
    return;
  end if;
  begin
    v := public._validar_descuento(p_codigo, p_subtotal, v_uid);
  exception when sqlstate 'P0001' then
    v_error := sqlerrm;
  end;
  -- Fuera del bloque: el intento queda guardado aunque el código no sirva.
  insert into public.intentos_descuento (usuario_id, codigo_id, exito) values (v_uid, v.id, v_error is null);
  if v_error is not null then
    return query select null::text, null::numeric, v_error;
  else
    return query select v.codigo, v.porcentaje, null::text;
  end if;
end;
$$;

revoke all on function public.validar_descuento(text, numeric) from public, anon;
grant execute on function public.validar_descuento(text, numeric) to authenticated;

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
  v_depto text := btrim(coalesce(p_direccion ->> 'departamento', ''));
  v_muni text := btrim(coalesce(p_direccion ->> 'municipio', ''));
  v_ciudad text := btrim(coalesce(p_direccion ->> 'ciudad', ''));
  v_colonia text := btrim(coalesce(p_direccion ->> 'colonia', ''));
  v_dir text := btrim(coalesce(p_direccion ->> 'direccion', ''));
  v_ref text := nullif(btrim(coalesce(p_direccion ->> 'referencia', '')), '');
begin
  if v_uid is null then raise exception 'Debes iniciar sesión para comprar'; end if;
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

  insert into public.pedidos (usuario_id, estado, tipo_cliente, contacto_nombre, contacto_correo, contacto_telefono,
    departamento, municipio, ciudad, colonia, direccion, referencia, zona_envio, envio, subtotal, total, confirmado_en)
  values (v_uid, v_estado, v_perfil.tipo_cliente, v_nombre, v_correo, v_tel, v_depto, v_muni, v_ciudad, v_colonia, v_dir, v_ref,
    case when v_depto = 'Cortés' and lower(v_muni) = 'san pedro sula' then 'sps' else 'resto' end,
    0, 0, 0, case when v_estado = 'confirmado' then now() end)
  returning id, codigo into v_pedido, v_codigo;

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
comment on function public._crear_pedido(uuid, jsonb, jsonb, jsonb, boolean, text) is 'v0012: límites de pedidos y códigos validados';

-- ------------------------------------------------------------
-- 3. CHAT: máximo 30 mensajes cada 10 minutos por persona (el admin no tiene límite)
-- ------------------------------------------------------------
create or replace function public.limitar_mensajes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.es_admin() and (
    select count(*) from public.pedido_mensajes where autor_id = new.autor_id and creado_en > now() - interval '10 minutes'
  ) >= 30 then
    raise exception 'Enviaste muchos mensajes seguidos. Espera unos minutos.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_limitar_mensajes on public.pedido_mensajes;
create trigger trg_limitar_mensajes before insert on public.pedido_mensajes
  for each row execute function public.limitar_mensajes();

-- ------------------------------------------------------------
-- 4. ÍNDICES EN LLAVES FORÁNEAS
-- ------------------------------------------------------------
create index if not exists abonos_creado_por_idx on public.abonos (creado_por);
create index if not exists codigos_descuento_cliente_idx on public.codigos_descuento (cliente_id);
create index if not exists compra_items_materia_idx on public.compra_items (materia_id);
create index if not exists compra_items_variante_idx on public.compra_items (variante_id);
create index if not exists compras_proveedor_idx on public.compras (proveedor_id);
create index if not exists cotizacion_items_variante_idx on public.cotizacion_items (variante_id);
create index if not exists cotizaciones_cliente_idx on public.cotizaciones (cliente_id);
create index if not exists cotizaciones_pedido_idx on public.cotizaciones (pedido_id);
create index if not exists facturas_cliente_idx on public.facturas (cliente_id);
create index if not exists inicio_productos_variante_idx on public.inicio_productos (variante_id);
create index if not exists inicio_secciones_categoria_idx on public.inicio_secciones (categoria_id);
create index if not exists movimientos_inventario_pedido_idx on public.movimientos_inventario (pedido_id);
create index if not exists pedido_items_variante_idx on public.pedido_items (variante_id);
create index if not exists pedido_mensajes_autor_idx on public.pedido_mensajes (autor_id, creado_en desc);
create index if not exists produccion_consumos_materia_idx on public.produccion_consumos (materia_id);
create index if not exists produccion_consumos_produccion_idx on public.produccion_consumos (produccion_id);
create index if not exists producciones_variante_idx on public.producciones (variante_id);
create index if not exists productos_categoria_idx on public.productos (categoria_id);
create index if not exists receta_ingredientes_materia_idx on public.receta_ingredientes (materia_id);
create index if not exists variantes_aroma_idx on public.variantes (aroma_id);
create index if not exists pedidos_usuario_creado_idx on public.pedidos (usuario_id, creado_en desc);
create index if not exists pedidos_estado_idx on public.pedidos (estado);

-- ------------------------------------------------------------
-- 5. INICIO: tarjetas fijas que se pueden ocultar y ordenar
-- ------------------------------------------------------------
alter table public.inicio_secciones drop constraint if exists inicio_secciones_modo_check;
alter table public.inicio_secciones add constraint inicio_secciones_modo_check
  check (modo in ('manual', 'mas_vendidos', 'nuevos', 'estrella', 'categorias', 'aromas'));
-- Una sola tarjeta de cada tipo fijo.
create unique index if not exists inicio_secciones_fija_uidx on public.inicio_secciones (modo)
  where modo in ('estrella', 'categorias', 'aromas');

do $$
begin
  if exists (select 1 from public.inicio_secciones where modo in ('estrella', 'categorias', 'aromas')) then return; end if;
  -- Mismo orden que tenía el inicio: estrella, categorías, aromas y después las filas de productos.
  update public.inicio_secciones set orden = orden + 3;
  insert into public.inicio_secciones (titulo, modo, orden) values
    ('Producto estrella', 'estrella', 1),
    ('Categorías', 'categorias', 2),
    ('Explora por aroma', 'aromas', 3);
end $$;
