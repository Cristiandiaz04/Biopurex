-- ============================================================
-- BIOPUREX · 0006 · Materia prima, reglas de creación y producción
-- Cómo trabaja BIOPUREX (Cristian, 2026-10-08): el dueño FABRICA los productos líquidos con
-- materia prima (base, aromatizante, colorante…). Solo artículos como escobas se compran hechos.
-- - materias_primas: catálogo con stock en su unidad (kg, lb, L…), mínimo y costo.
-- - recetas ("reglas de creación"): qué materias y cuánto lleva cada variante (producto + aroma)
--   por lote, y cuántas unidades rinde.
-- - admin_producir: suma las unidades al inventario de la tienda y descuenta la materia prima.
-- - Compras: cada línea es materia prima O un producto de reventa.
-- Se puede volver a correr sin problema (es idempotente).
-- Ejecutar DESPUÉS de 0005. Verificar con supabase/estado_migraciones.sql.
-- ============================================================

set lock_timeout = '10s';

-- ------------------------------------------------------------
-- 1. MATERIA PRIMA
-- ------------------------------------------------------------
create table if not exists public.materias_primas (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique check (codigo ~ '^[A-Z0-9-]{2,30}$'),
  nombre text not null check (char_length(nombre) between 2 and 120),
  unidad text not null check (unidad in ('kg', 'g', 'lb', 'L', 'ml', 'gal', 'unidad')),
  stock numeric(14, 3) not null default 0 check (stock >= 0),
  stock_minimo numeric(14, 3) not null default 0 check (stock_minimo >= 0),
  costo_unitario numeric(12, 4) check (costo_unitario is null or costo_unitario >= 0),
  notas text check (notas is null or char_length(notas) <= 300),
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

create table if not exists public.movimientos_materia (
  id uuid primary key default gen_random_uuid(),
  materia_id uuid not null references public.materias_primas (id),
  tipo text not null check (tipo in ('entrada', 'consumo', 'ajuste')),
  cantidad numeric(14, 3) not null,
  stock_resultante numeric(14, 3) not null,
  documento text,
  nota text,
  creado_por uuid default auth.uid(),
  creado_en timestamptz not null default now()
);

create index if not exists movimientos_materia_idx on public.movimientos_materia (materia_id, creado_en desc);

alter table public.materias_primas enable row level security;
alter table public.movimientos_materia enable row level security;
drop policy if exists materias_admin on public.materias_primas;
create policy materias_admin on public.materias_primas for all to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));
drop policy if exists movimientos_materia_admin on public.movimientos_materia;
create policy movimientos_materia_admin on public.movimientos_materia for select to authenticated
  using ((select public.es_admin()));

-- El stock de la materia prima solo cambia con funciones (queda en su kardex).
revoke insert, update on public.materias_primas from anon, authenticated;
grant insert (codigo, nombre, unidad, stock_minimo, costo_unitario, notas, activo) on public.materias_primas to authenticated;
grant update (codigo, nombre, unidad, stock_minimo, costo_unitario, notas, activo) on public.materias_primas to authenticated;

-- Movimiento de materia prima + kardex (uso interno). cantidad con signo: + entra, − sale.
create or replace function public._mover_materia(p_materia uuid, p_tipo text, p_cantidad numeric, p_documento text, p_nota text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_stock numeric(14, 3);
  v_nombre text;
begin
  select stock, nombre into v_stock, v_nombre from public.materias_primas where id = p_materia for update;
  if not found then raise exception 'Materia prima no encontrada'; end if;
  if v_stock + p_cantidad < 0 then
    raise exception 'No hay suficiente %: hay %, se necesitan %', v_nombre, v_stock, abs(p_cantidad);
  end if;
  update public.materias_primas set stock = stock + p_cantidad where id = p_materia returning stock into v_stock;
  insert into public.movimientos_materia (materia_id, tipo, cantidad, stock_resultante, documento, nota)
  values (p_materia, p_tipo, p_cantidad, v_stock, p_documento, p_nota);
end;
$$;

revoke all on function public._mover_materia(uuid, text, numeric, text, text) from public, anon, authenticated;

create or replace function public.admin_ajustar_materia(p_materia uuid, p_cantidad numeric, p_nota text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.es_admin() then raise exception 'Solo el administrador'; end if;
  if p_cantidad is null or p_cantidad = 0 then raise exception 'Indica una cantidad distinta de cero'; end if;
  if char_length(btrim(coalesce(p_nota, ''))) < 3 then raise exception 'Escribe el motivo del ajuste'; end if;
  perform public._mover_materia(p_materia, case when p_cantidad > 0 then 'entrada' else 'ajuste' end, p_cantidad, 'Ajuste', btrim(p_nota));
end;
$$;

revoke all on function public.admin_ajustar_materia(uuid, numeric, text) from public, anon;
grant execute on function public.admin_ajustar_materia(uuid, numeric, text) to authenticated;

-- ------------------------------------------------------------
-- 2. REGLAS DE CREACIÓN (recetas por variante)
-- ------------------------------------------------------------
create table if not exists public.recetas (
  id uuid primary key default gen_random_uuid(),
  variante_id uuid not null unique references public.variantes (id) on delete cascade,
  rendimiento numeric(12, 3) not null default 1 check (rendimiento > 0),
  notas text check (notas is null or char_length(notas) <= 500),
  actualizado_en timestamptz not null default now()
);

create table if not exists public.receta_ingredientes (
  id uuid primary key default gen_random_uuid(),
  receta_id uuid not null references public.recetas (id) on delete cascade,
  materia_id uuid not null references public.materias_primas (id),
  cantidad numeric(14, 4) not null check (cantidad > 0),
  unique (receta_id, materia_id)
);

alter table public.recetas enable row level security;
alter table public.receta_ingredientes enable row level security;
drop policy if exists recetas_admin on public.recetas;
create policy recetas_admin on public.recetas for all to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));
drop policy if exists receta_ingredientes_admin on public.receta_ingredientes;
create policy receta_ingredientes_admin on public.receta_ingredientes for all to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));

-- ------------------------------------------------------------
-- 3. PRODUCCIÓN
-- ------------------------------------------------------------
create sequence if not exists public.producciones_numero_seq start 1;

create table if not exists public.producciones (
  id uuid primary key default gen_random_uuid(),
  numero bigint not null unique default nextval('public.producciones_numero_seq'),
  codigo text generated always as ('PRD-' || lpad(numero::text, 4, '0')) stored,
  variante_id uuid not null references public.variantes (id),
  cantidad int not null check (cantidad between 1 and 100000),
  costo_total numeric(12, 2) not null default 0,
  costo_unitario numeric(12, 4),
  nota text check (nota is null or char_length(nota) <= 300),
  creado_por uuid default auth.uid(),
  creado_en timestamptz not null default now()
);

create table if not exists public.produccion_consumos (
  id uuid primary key default gen_random_uuid(),
  produccion_id uuid not null references public.producciones (id) on delete cascade,
  materia_id uuid not null references public.materias_primas (id),
  cantidad numeric(14, 4) not null,
  costo numeric(12, 2)
);

alter table public.producciones enable row level security;
alter table public.produccion_consumos enable row level security;
drop policy if exists producciones_admin on public.producciones;
create policy producciones_admin on public.producciones for select to authenticated using ((select public.es_admin()));
drop policy if exists produccion_consumos_admin on public.produccion_consumos;
create policy produccion_consumos_admin on public.produccion_consumos for select to authenticated using ((select public.es_admin()));

-- Fabrica p_cantidad unidades de una variante según su regla de creación.
create or replace function public.admin_producir(p_variante uuid, p_cantidad int, p_nota text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_receta public.recetas;
  v_prod uuid;
  v_codigo text;
  v_ing record;
  v_necesario numeric(14, 4);
  v_costo numeric(12, 2) := 0;
  v_faltan text[] := '{}';
  v_sin_costo boolean := false;
begin
  if not public.es_admin() then raise exception 'Solo el administrador'; end if;
  if p_cantidad is null or p_cantidad < 1 or p_cantidad > 100000 then raise exception 'Cantidad no válida'; end if;
  select * into v_receta from public.recetas where variante_id = p_variante;
  if not found then raise exception 'Este producto no tiene regla de creación. Créala primero.'; end if;
  if not exists (select 1 from public.receta_ingredientes where receta_id = v_receta.id) then
    raise exception 'La regla de creación no tiene materias primas';
  end if;

  -- Revisar todo antes de mover nada (mensaje con todo lo que falta).
  for v_ing in
    select ri.materia_id, ri.cantidad, m.nombre, m.unidad, m.stock, m.costo_unitario
      from public.receta_ingredientes ri join public.materias_primas m on m.id = ri.materia_id
     where ri.receta_id = v_receta.id
     order by ri.materia_id
       for update of m
  loop
    v_necesario := round(v_ing.cantidad * p_cantidad / v_receta.rendimiento, 3);
    if v_ing.stock < v_necesario then
      v_faltan := v_faltan || format('%s (hay %s %s, se necesitan %s)', v_ing.nombre, trim(to_char(v_ing.stock, 'FM999999990.###')), v_ing.unidad, trim(to_char(v_necesario, 'FM999999990.###')));
    end if;
  end loop;
  if array_length(v_faltan, 1) > 0 then
    raise exception 'Falta materia prima: %', array_to_string(v_faltan, '; ');
  end if;

  insert into public.producciones (variante_id, cantidad, nota) values (p_variante, p_cantidad, nullif(btrim(coalesce(p_nota, '')), ''))
  returning id, codigo into v_prod, v_codigo;

  for v_ing in
    select ri.materia_id, ri.cantidad, m.costo_unitario
      from public.receta_ingredientes ri join public.materias_primas m on m.id = ri.materia_id
     where ri.receta_id = v_receta.id order by ri.materia_id
  loop
    v_necesario := round(v_ing.cantidad * p_cantidad / v_receta.rendimiento, 3);
    perform public._mover_materia(v_ing.materia_id, 'consumo', -v_necesario, v_codigo, 'Producción');
    insert into public.produccion_consumos (produccion_id, materia_id, cantidad, costo)
    values (v_prod, v_ing.materia_id, v_necesario, round(v_necesario * v_ing.costo_unitario, 2));
    if v_ing.costo_unitario is null then v_sin_costo := true; end if;
    v_costo := v_costo + coalesce(round(v_necesario * v_ing.costo_unitario, 2), 0);
  end loop;

  update public.producciones
     set costo_total = v_costo, costo_unitario = case when v_sin_costo then null else round(v_costo / p_cantidad, 4) end
   where id = v_prod;

  -- Producto terminado al inventario de la tienda (kardex: Entrada · PRD-xxxx).
  perform public._mover_stock(p_variante, 'entrada', p_cantidad, null, v_codigo);
  update public.movimientos_inventario set nota = 'Producción'
   where id = (select id from public.movimientos_inventario where variante_id = p_variante order by creado_en desc limit 1);

  -- Costo del producto = costo de esta producción (si todas las materias tienen costo).
  if not v_sin_costo then
    update public.productos set costo = round(v_costo / p_cantidad, 2)
     where id = (select producto_id from public.variantes where id = p_variante);
  end if;

  return v_codigo;
end;
$$;

revoke all on function public.admin_producir(uuid, int, text) from public, anon;
grant execute on function public.admin_producir(uuid, int, text) to authenticated;

-- ------------------------------------------------------------
-- 4. COMPRAS: materia prima o producto de reventa
-- ------------------------------------------------------------
alter table public.compra_items alter column variante_id drop not null;
alter table public.compra_items add column if not exists materia_id uuid references public.materias_primas (id);

-- La cantidad pasa a admitir decimales (20.5 kg). La columna total depende de ella: se recrea.
do $$
begin
  if (select data_type from information_schema.columns
       where table_schema = 'public' and table_name = 'compra_items' and column_name = 'cantidad') = 'integer' then
    alter table public.compra_items drop column total;
    alter table public.compra_items drop constraint if exists compra_items_cantidad_check;
    alter table public.compra_items alter column cantidad type numeric(14, 3);
    alter table public.compra_items add column total numeric(12, 2) generated always as (round(cantidad * costo_unitario, 2)) stored;
  end if;
end;
$$;

alter table public.compra_items drop constraint if exists compra_items_un_destino;
alter table public.compra_items add constraint compra_items_un_destino
  check ((variante_id is null) <> (materia_id is null));
alter table public.compra_items drop constraint if exists compra_items_cantidad_valida;
alter table public.compra_items add constraint compra_items_cantidad_valida
  check (cantidad > 0 and cantidad <= 1000000 and (variante_id is null or cantidad = trunc(cantidad)));

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

  -- Productos de reventa → inventario de la tienda.
  for v_it in
    select ci.variante_id, ci.cantidad, ci.costo_unitario, v.producto_id
      from public.compra_items ci join public.variantes v on v.id = ci.variante_id
     where ci.compra_id = p_compra order by ci.variante_id
  loop
    perform public._mover_stock(v_it.variante_id, 'entrada', v_it.cantidad::int, null, v_c.codigo);
    update public.movimientos_inventario set nota = 'Compra a proveedor'
     where id = (select id from public.movimientos_inventario where variante_id = v_it.variante_id order by creado_en desc limit 1);
    update public.productos set costo = v_it.costo_unitario where id = v_it.producto_id;
  end loop;

  -- Materia prima → inventario de materia prima (y su último costo).
  for v_it in
    select ci.materia_id, ci.cantidad, ci.costo_unitario
      from public.compra_items ci where ci.compra_id = p_compra and ci.materia_id is not null order by ci.materia_id
  loop
    perform public._mover_materia(v_it.materia_id, 'entrada', v_it.cantidad, v_c.codigo, 'Compra a proveedor');
    update public.materias_primas set costo_unitario = v_it.costo_unitario where id = v_it.materia_id;
  end loop;

  update public.compras set estado = 'recibida', recibida_en = now() where id = p_compra;
end;
$$;
