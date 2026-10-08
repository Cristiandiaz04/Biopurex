-- ============================================================
-- BIOPUREX · 0001 · Esquema inicial
-- Perfiles, catálogo (productos por tamaño + variantes por aroma), direcciones, pedidos,
-- chat por pedido, kardex, configuración y bucket de comprobantes.
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query > Run.
-- Después correr 0002_catalogo_inicial.sql y verificar con supabase/estado_migraciones.sql.
-- ============================================================

-- ------------------------------------------------------------
-- 1. PERFILES (1 a 1 con auth.users)
-- ------------------------------------------------------------
create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null default '' check (char_length(nombre) <= 120),
  correo text not null,
  telefono text check (telefono is null or telefono ~ '^[0-9]{8}$'),
  rtn text check (rtn is null or rtn ~ '^[0-9]{14}$'),
  rol text not null default 'cliente' check (rol in ('cliente', 'admin')),
  tipo_cliente text not null default 'normal' check (tipo_cliente in ('normal', 'contra_entrega', 'credito')),
  limite_credito numeric(12, 2) not null default 0 check (limite_credito >= 0),
  saldo numeric(12, 2) not null default 0,
  creado_en timestamptz not null default now()
);

-- ¿El usuario actual es admin? (security definer: evita recursión de RLS sobre perfiles)
create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.perfiles where id = auth.uid() and rol = 'admin');
$$;

-- Crea el perfil al registrarse.
create or replace function public.crear_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfiles (id, nombre, correo)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'nombre', ''), 120), coalesce(new.email, ''));
  return new;
end;
$$;

create trigger trg_crear_perfil
  after insert on auth.users
  for each row execute function public.crear_perfil();

-- Un cliente solo puede cambiar su nombre, teléfono y RTN. Rol, tipo, límite y saldo los toca
-- el admin o las funciones del sistema (security definer, que no corren como 'authenticated').
create or replace function public.proteger_perfil()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') and not public.es_admin() then
    if new.rol is distinct from old.rol
       or new.tipo_cliente is distinct from old.tipo_cliente
       or new.limite_credito is distinct from old.limite_credito
       or new.saldo is distinct from old.saldo
       or new.correo is distinct from old.correo
       or new.id is distinct from old.id then
      raise exception 'No tienes permiso para cambiar estos datos';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_proteger_perfil
  before update on public.perfiles
  for each row execute function public.proteger_perfil();

alter table public.perfiles enable row level security;

create policy perfiles_select on public.perfiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.es_admin()));

create policy perfiles_update on public.perfiles
  for update to authenticated
  using (id = (select auth.uid()) or (select public.es_admin()))
  with check (id = (select auth.uid()) or (select public.es_admin()));

-- ------------------------------------------------------------
-- 2. CATÁLOGO
-- ------------------------------------------------------------
create table public.aromas (
  id text primary key,
  nombre text not null,
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  orden int not null default 0
);

create table public.categorias (
  id text primary key,
  nombre text not null,
  corto text not null,
  img text not null,
  tinte text references public.aromas (id),
  oscura boolean not null default false,
  orden int not null default 0
);

-- Un producto por TAMAÑO (decisión de Cristian, 2026-10-08).
create table public.productos (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  linea text not null,
  nombre text not null,
  nombre_base text not null,
  tamano text not null,
  categoria_id text not null references public.categorias (id),
  precio numeric(12, 2) check (precio is null or precio >= 0),
  descripcion text not null default '',
  beneficios text[] not null default '{}',
  modo_uso text[] not null default '{}',
  seguridad boolean not null default false,
  cotizar boolean not null default false,
  insignias text[] not null default '{}',
  tinte text references public.aromas (id),
  notas jsonb not null default '{}',
  activo boolean not null default true,
  orden int not null default 0,
  creado_en timestamptz not null default now()
);

create index productos_linea_idx on public.productos (linea);

-- Variantes = aromas de cada producto, con su SKU y stock.
create table public.variantes (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references public.productos (id) on delete cascade,
  clave text not null,
  aroma_id text references public.aromas (id),
  etiqueta text not null,
  img text not null,
  sku text not null unique,
  stock int not null default 0 check (stock >= 0),
  stock_apartado int not null default 0 check (stock_apartado >= 0),
  stock_minimo int not null default 5 check (stock_minimo >= 0),
  disponible boolean generated always as (stock - stock_apartado > 0) stored,
  activo boolean not null default true,
  orden int not null default 0,
  unique (producto_id, clave)
);

create index variantes_producto_idx on public.variantes (producto_id);

alter table public.aromas enable row level security;
alter table public.categorias enable row level security;
alter table public.productos enable row level security;
alter table public.variantes enable row level security;

create policy aromas_select on public.aromas for select to anon, authenticated using (true);
create policy categorias_select on public.categorias for select to anon, authenticated using (true);
create policy productos_select on public.productos for select to anon, authenticated
  using (activo or (select public.es_admin()));
create policy variantes_select on public.variantes for select to anon, authenticated
  using (activo or (select public.es_admin()));

-- El público no ve cantidades de stock, solo si hay disponible.
revoke select on public.variantes from anon, authenticated;
grant select (id, producto_id, clave, aroma_id, etiqueta, img, sku, disponible, activo, orden)
  on public.variantes to anon, authenticated;

-- ------------------------------------------------------------
-- 3. CONFIGURACIÓN (una sola fila): datos bancarios y envío
-- ------------------------------------------------------------
create table public.configuracion (
  id boolean primary key default true check (id),
  banco text not null,
  tipo_cuenta text not null,
  numero_cuenta text not null,
  titular text not null,
  envio_sps numeric(12, 2) not null default 60,
  envio_resto numeric(12, 2) not null default 150
);

alter table public.configuracion enable row level security;
create policy configuracion_select on public.configuracion for select to anon, authenticated using (true);
create policy configuracion_update on public.configuracion for update to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));

-- ------------------------------------------------------------
-- 4. DIRECCIONES
-- ------------------------------------------------------------
create table public.direcciones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references public.perfiles (id) on delete cascade,
  etiqueta text not null default 'Casa' check (char_length(etiqueta) between 1 and 40),
  nombre text not null check (char_length(nombre) between 1 and 120),
  telefono text not null check (telefono ~ '^[0-9]{8}$'),
  departamento text not null,
  ciudad text not null check (char_length(ciudad) between 1 and 80),
  colonia text not null check (char_length(colonia) between 1 and 120),
  direccion text not null check (char_length(direccion) between 1 and 200),
  referencia text check (referencia is null or char_length(referencia) <= 200),
  predeterminada boolean not null default false,
  creado_en timestamptz not null default now()
);

create index direcciones_usuario_idx on public.direcciones (usuario_id);

alter table public.direcciones enable row level security;
create policy direcciones_propias on public.direcciones for all to authenticated
  using (usuario_id = (select auth.uid()) or (select public.es_admin()))
  with check (usuario_id = (select auth.uid()));

-- ------------------------------------------------------------
-- 5. PEDIDOS
-- ------------------------------------------------------------
create sequence public.pedidos_numero_seq start 10500;

create table public.pedidos (
  id uuid primary key default gen_random_uuid(),
  numero bigint not null unique default nextval('public.pedidos_numero_seq'),
  codigo text generated always as ('BPX-' || numero::text) stored,
  usuario_id uuid not null references public.perfiles (id),
  estado text not null default 'esperando_pago'
    check (estado in ('esperando_pago', 'pago_en_revision', 'confirmado', 'enviado', 'entregado', 'cancelado')),
  tipo_cliente text not null check (tipo_cliente in ('normal', 'contra_entrega', 'credito')),
  contacto_nombre text not null,
  contacto_correo text not null,
  contacto_telefono text not null,
  departamento text not null,
  ciudad text not null,
  colonia text not null,
  direccion text not null,
  referencia text,
  zona_envio text not null check (zona_envio in ('sps', 'resto')),
  envio numeric(12, 2) not null,
  subtotal numeric(12, 2) not null,
  total numeric(12, 2) not null,
  comprobante_path text,
  metodo_pago_entrega text check (metodo_pago_entrega in ('efectivo', 'tarjeta', 'transferencia')),
  motivo_cancelacion text,
  creado_en timestamptz not null default now(),
  pago_revision_en timestamptz,
  confirmado_en timestamptz,
  enviado_en timestamptz,
  entregado_en timestamptz,
  cancelado_en timestamptz
);

create unique index pedidos_codigo_idx on public.pedidos (codigo);
create index pedidos_usuario_idx on public.pedidos (usuario_id, creado_en desc);
create index pedidos_estado_idx on public.pedidos (estado);

create table public.pedido_items (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos (id) on delete cascade,
  variante_id uuid not null references public.variantes (id),
  producto_slug text not null,
  producto_nombre text not null,
  aroma_id text,
  aroma_nombre text,
  tamano text not null,
  img text not null,
  precio_unitario numeric(12, 2) not null,
  cantidad int not null check (cantidad between 1 and 99),
  total numeric(12, 2) generated always as (precio_unitario * cantidad) stored
);

create index pedido_items_pedido_idx on public.pedido_items (pedido_id);

create table public.pedido_mensajes (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos (id) on delete cascade,
  autor_id uuid not null default auth.uid() references public.perfiles (id),
  de_admin boolean not null default false,
  texto text not null check (char_length(btrim(texto)) between 1 and 1000),
  creado_en timestamptz not null default now()
);

create index pedido_mensajes_pedido_idx on public.pedido_mensajes (pedido_id, creado_en);

alter table public.pedidos enable row level security;
alter table public.pedido_items enable row level security;
alter table public.pedido_mensajes enable row level security;

-- Los pedidos solo se crean y cambian de estado con las funciones de abajo (security definer).
create policy pedidos_select on public.pedidos for select to authenticated
  using (usuario_id = (select auth.uid()) or (select public.es_admin()));

create policy pedido_items_select on public.pedido_items for select to authenticated
  using (exists (
    select 1 from public.pedidos p
    where p.id = pedido_id and (p.usuario_id = (select auth.uid()) or (select public.es_admin()))
  ));

create policy pedido_mensajes_select on public.pedido_mensajes for select to authenticated
  using (exists (
    select 1 from public.pedidos p
    where p.id = pedido_id and (p.usuario_id = (select auth.uid()) or (select public.es_admin()))
  ));

create policy pedido_mensajes_insert on public.pedido_mensajes for insert to authenticated
  with check (
    autor_id = (select auth.uid())
    and (
      (de_admin = false and exists (
        select 1 from public.pedidos p where p.id = pedido_id and p.usuario_id = (select auth.uid())
      ))
      or (de_admin = true and (select public.es_admin()))
    )
  );

-- Chat en vivo
alter publication supabase_realtime add table public.pedido_mensajes;

-- ------------------------------------------------------------
-- 6. KARDEX (movimientos de inventario)
-- ------------------------------------------------------------
create table public.movimientos_inventario (
  id uuid primary key default gen_random_uuid(),
  variante_id uuid not null references public.variantes (id),
  tipo text not null check (tipo in ('entrada', 'venta', 'apartado', 'liberacion', 'devolucion', 'ajuste')),
  cantidad int not null,
  stock_resultante int not null,
  apartado_resultante int not null,
  documento text,
  pedido_id uuid references public.pedidos (id),
  nota text,
  creado_por uuid default auth.uid(),
  creado_en timestamptz not null default now()
);

create index movimientos_variante_idx on public.movimientos_inventario (variante_id, creado_en desc);

alter table public.movimientos_inventario enable row level security;
create policy movimientos_select on public.movimientos_inventario for select to authenticated
  using ((select public.es_admin()));

-- ------------------------------------------------------------
-- 7. FUNCIONES DE PEDIDOS
-- Reglas: Normal → "Esperando pago" y aparta stock. Contra entrega / Crédito → "Confirmado" y
-- descuenta stock (crédito además suma al saldo). Cancelar devuelve lo apartado o vendido.
-- ------------------------------------------------------------

-- Movimiento de stock + registro en el kardex (uso interno).
create or replace function public._mover_stock(
  p_variante uuid, p_tipo text, p_cantidad int, p_pedido uuid, p_documento text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_stock int;
  v_apartado int;
begin
  if p_tipo = 'apartado' then
    update public.variantes set stock_apartado = stock_apartado + p_cantidad where id = p_variante
      returning stock, stock_apartado into v_stock, v_apartado;
  elsif p_tipo = 'liberacion' then
    update public.variantes set stock_apartado = greatest(stock_apartado - p_cantidad, 0) where id = p_variante
      returning stock, stock_apartado into v_stock, v_apartado;
  elsif p_tipo = 'venta' then
    update public.variantes set stock = stock - p_cantidad where id = p_variante
      returning stock, stock_apartado into v_stock, v_apartado;
  elsif p_tipo in ('devolucion', 'entrada') then
    update public.variantes set stock = stock + p_cantidad where id = p_variante
      returning stock, stock_apartado into v_stock, v_apartado;
  else
    raise exception 'Tipo de movimiento no válido: %', p_tipo;
  end if;

  insert into public.movimientos_inventario
    (variante_id, tipo, cantidad, stock_resultante, apartado_resultante, documento, pedido_id)
  values (p_variante, p_tipo, p_cantidad, v_stock, v_apartado, p_documento, p_pedido);
end;
$$;

revoke all on function public._mover_stock(uuid, text, int, uuid, text) from public, anon, authenticated;

-- Crea un pedido desde el checkout. Precios y envío se calculan aquí, nunca se confían al cliente.
create or replace function public.crear_pedido(p_items jsonb, p_contacto jsonb, p_direccion jsonb, p_guardar_direccion boolean default false)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_perfil public.perfiles;
  v_conf public.configuracion;
  v_pedido uuid;
  v_codigo text;
  v_estado text;
  v_zona text;
  v_envio numeric(12, 2);
  v_subtotal numeric(12, 2) := 0;
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

  -- Validación (el front valida lo mismo; esto es la defensa real)
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

  -- Bloquea las variantes en orden para evitar ventas dobles del último artículo.
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

  update public.pedidos set subtotal = v_subtotal, total = v_subtotal + v_envio where id = v_pedido;

  if v_perfil.tipo_cliente = 'credito' then
    update public.perfiles set saldo = saldo + v_subtotal + v_envio where id = v_uid;
  end if;

  -- Completa el perfil con los datos de contacto si estaban vacíos.
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

revoke all on function public.crear_pedido(jsonb, jsonb, jsonb, boolean) from public, anon;
grant execute on function public.crear_pedido(jsonb, jsonb, jsonb, boolean) to authenticated;

-- El cliente registra el comprobante que ya subió al bucket.
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
     set comprobante_path = p_path, estado = 'pago_en_revision', pago_revision_en = now()
   where id = p_pedido;
end;
$$;

revoke all on function public.registrar_comprobante(uuid, text) from public, anon;
grant execute on function public.registrar_comprobante(uuid, text) to authenticated;

-- ---- Acciones del admin (las usa el panel en la fase 3) ----

create or replace function public.admin_confirmar_pago(p_pedido uuid)
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
  select * into v_ped from public.pedidos where id = p_pedido for update;
  if not found then raise exception 'Pedido no encontrado'; end if;
  if v_ped.estado not in ('esperando_pago', 'pago_en_revision') then raise exception 'El pedido no está esperando pago'; end if;
  for v_it in select variante_id, cantidad from public.pedido_items where pedido_id = p_pedido order by variante_id loop
    perform public._mover_stock(v_it.variante_id, 'liberacion', v_it.cantidad, p_pedido, v_ped.codigo);
    perform public._mover_stock(v_it.variante_id, 'venta', v_it.cantidad, p_pedido, v_ped.codigo);
  end loop;
  update public.pedidos set estado = 'confirmado', confirmado_en = now() where id = p_pedido;
end;
$$;

create or replace function public.admin_marcar_enviado(p_pedido uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.es_admin() then raise exception 'Solo el administrador'; end if;
  update public.pedidos set estado = 'enviado', enviado_en = now() where id = p_pedido and estado = 'confirmado';
  if not found then raise exception 'Solo se puede enviar un pedido confirmado'; end if;
end;
$$;

create or replace function public.admin_marcar_entregado(p_pedido uuid, p_metodo text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ped public.pedidos;
begin
  if not public.es_admin() then raise exception 'Solo el administrador'; end if;
  select * into v_ped from public.pedidos where id = p_pedido for update;
  if not found or v_ped.estado <> 'enviado' then raise exception 'Solo se puede entregar un pedido enviado'; end if;
  if v_ped.tipo_cliente = 'contra_entrega' and (p_metodo is null or p_metodo not in ('efectivo', 'tarjeta', 'transferencia')) then
    raise exception 'Indica cómo pagó el cliente al recibir';
  end if;
  update public.pedidos set estado = 'entregado', entregado_en = now(), metodo_pago_entrega = p_metodo where id = p_pedido;
end;
$$;

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
  update public.pedidos set estado = 'cancelado', cancelado_en = now(), motivo_cancelacion = btrim(p_motivo) where id = p_pedido;
end;
$$;

revoke all on function public.admin_confirmar_pago(uuid) from public, anon;
revoke all on function public.admin_marcar_enviado(uuid) from public, anon;
revoke all on function public.admin_marcar_entregado(uuid, text) from public, anon;
revoke all on function public.admin_cancelar_pedido(uuid, text) from public, anon;
grant execute on function public.admin_confirmar_pago(uuid) to authenticated;
grant execute on function public.admin_marcar_enviado(uuid) to authenticated;
grant execute on function public.admin_marcar_entregado(uuid, text) to authenticated;
grant execute on function public.admin_cancelar_pedido(uuid, text) to authenticated;

-- ------------------------------------------------------------
-- 8. STORAGE: comprobantes (privado). Ruta: <usuario_id>/<pedido_id>/<archivo>
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comprobantes', 'comprobantes', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'])
on conflict (id) do nothing;

create policy comprobantes_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'comprobantes'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.pedidos p
      where p.id::text = (storage.foldername(name))[2]
        and p.usuario_id = (select auth.uid())
        and p.estado in ('esperando_pago', 'pago_en_revision')
    )
  );

create policy comprobantes_select on storage.objects for select to authenticated
  using (
    bucket_id = 'comprobantes'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.es_admin()))
  );
