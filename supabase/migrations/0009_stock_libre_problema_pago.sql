-- ============================================================
-- BIOPUREX · 0009 · Pedidos sin límite de stock y "problema con el pago"
-- Pedido de Cristian (2026-10-08):
-- - Los clientes pueden pedir la cantidad que quieran aunque no haya stock: lo que falte se
--   produce y el dueño revisa cada pedido antes de confirmarlo. El stock de una variante puede
--   quedar negativo (= unidades vendidas pendientes de producir).
-- - En la revisión del pago, el admin puede marcar "Problema con el pago" (ej. subieron una foto
--   que no es el comprobante): el pedido vuelve a "Esperando pago" con el motivo, sin cancelarse,
--   y el cliente puede subir otro comprobante.
-- Se puede volver a correr sin problema (es idempotente).
-- Ejecutar DESPUÉS de 0008. Verificar con supabase/estado_migraciones.sql.
-- ============================================================

set lock_timeout = '10s';

-- ------------------------------------------------------------
-- 1. STOCK SIN LÍMITE
-- ------------------------------------------------------------
-- Quitar el "stock >= 0" de variantes (el apartado sigue sin poder ser negativo).
do $$
declare
  v_nombre text;
begin
  for v_nombre in
    select conname from pg_constraint
     where conrelid = 'public.variantes'::regclass and contype = 'c'
       and pg_get_constraintdef(oid) = 'CHECK ((stock >= 0))'
  loop
    execute format('alter table public.variantes drop constraint %I', v_nombre);
  end loop;
end $$;

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

  if char_length(v_nombre) not between 2 and 120 then raise exception 'Ingresa tu nombre completo'; end if;
  if v_correo !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then raise exception 'Ingresa un correo válido'; end if;
  if v_tel !~ '^[0-9]{8}$' then raise exception 'El teléfono debe tener 8 dígitos'; end if;
  if char_length(v_colonia) not between 2 and 120 then raise exception 'Ingresa tu colonia o barrio'; end if;
  if char_length(v_dir) not between 3 and 200 then raise exception 'Ingresa tu dirección'; end if;
  if v_ref is not null and char_length(v_ref) > 200 then raise exception 'El punto de referencia es muy largo'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Tu carrito está vacío'; end if;
  if jsonb_array_length(p_items) > 50 then raise exception 'Demasiados productos en un pedido'; end if;

  -- Zona de entrega: tiene que estar en la lista del admin. Las direcciones guardadas antes de esta
  -- migración no tienen municipio: se deduce por la ciudad.
  select m.nombre as municipio, m.costo_envio, c.nombre as ciudad
    into v_zona_rec
    from public.ciudades c
    join public.municipios m on m.id = c.municipio_id
   where m.activo and c.activo
     and m.departamento = v_depto
     and (v_muni = '' or lower(m.nombre) = lower(v_muni))
     and lower(c.nombre) = lower(v_ciudad)
   order by m.nombre
   limit 1;
  if not found then
    raise exception 'Por ahora no entregamos en esa zona. Elige municipio y ciudad de la lista.';
  end if;
  v_muni := v_zona_rec.municipio;
  v_ciudad := v_zona_rec.ciudad;

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

-- ------------------------------------------------------------
-- 2. PROBLEMA CON EL PAGO
-- ------------------------------------------------------------
alter table public.pedidos add column if not exists problema_pago text;
alter table public.pedidos add column if not exists problema_pago_en timestamptz;

create or replace function public.admin_problema_pago(p_pedido uuid, p_motivo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ped public.pedidos;
  v_motivo text := btrim(coalesce(p_motivo, ''));
begin
  if not public.es_admin() then raise exception 'Solo el administrador'; end if;
  if char_length(v_motivo) not between 3 and 300 then raise exception 'Escribe qué problema tiene el pago'; end if;
  select * into v_ped from public.pedidos where id = p_pedido for update;
  if not found then raise exception 'Pedido no encontrado'; end if;
  if v_ped.estado <> 'pago_en_revision' then raise exception 'Solo se puede marcar un pago que está en revisión'; end if;
  -- El stock sigue apartado: el pedido no se cancela.
  update public.pedidos
     set estado = 'esperando_pago', problema_pago = v_motivo, problema_pago_en = now()
   where id = p_pedido;
  -- Queda también en el chat del pedido.
  insert into public.pedido_mensajes (pedido_id, autor_id, de_admin, texto)
  values (p_pedido, auth.uid(), true, 'Hubo un problema con tu pago: ' || v_motivo || '. Sube un nuevo comprobante, por favor.');
end;
$$;

revoke all on function public.admin_problema_pago(uuid, text) from public, anon;
grant execute on function public.admin_problema_pago(uuid, text) to authenticated;

-- Al subir otro comprobante, el problema queda atendido.
create or replace function public.registrar_comprobante(p_pedido uuid, p_path text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ped public.pedidos;
begin
  select * into v_ped from public.pedidos where id = p_pedido for update;
  if not found or v_ped.usuario_id <> auth.uid() then raise exception 'Pedido no encontrado'; end if;
  if v_ped.estado not in ('esperando_pago', 'pago_en_revision') then
    raise exception 'Este pedido ya no necesita comprobante';
  end if;
  if p_path is null or split_part(p_path, '/', 1) <> auth.uid()::text or split_part(p_path, '/', 2) <> p_pedido::text then
    raise exception 'Archivo no válido';
  end if;
  update public.pedidos
     set comprobante_path = p_path, estado = 'pago_en_revision', pago_revision_en = now(), problema_pago = null
   where id = p_pedido;
end;
$$;

revoke all on function public.registrar_comprobante(uuid, text) from public, anon;
grant execute on function public.registrar_comprobante(uuid, text) to authenticated;
