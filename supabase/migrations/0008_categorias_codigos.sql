-- ============================================================
-- BIOPUREX · 0008 · Categorías administrables y código de producto
-- Pedido de Cristian (2026-10-08):
-- - El admin crea categorías desde el panel; cada una tiene un número (01, 02, 03…).
-- - Cada producto tiene un código: número de la categoría (2 dígitos) + correlativo dentro de la
--   categoría (4 dígitos). Ej.: 010001, 010002 (categoría 01) · 020001 (categoría 02).
-- - El código se asigna solo al crear el producto. Si el producto cambia de categoría, recibe
--   el siguiente código de la categoría nueva.
-- Se puede volver a correr sin problema (es idempotente).
-- Ejecutar DESPUÉS de 0007. Verificar con supabase/estado_migraciones.sql.
-- ============================================================

set lock_timeout = '10s';

-- ------------------------------------------------------------
-- 1. CATEGORÍAS: número, activa, imagen opcional
-- ------------------------------------------------------------
alter table public.categorias add column if not exists numero int;
alter table public.categorias add column if not exists activo boolean not null default true;
alter table public.categorias alter column img drop not null;

-- Las existentes se numeran en el orden en que aparecen en la tienda.
update public.categorias c
   set numero = x.n
  from (select id, row_number() over (order by orden, nombre) as n from public.categorias) x
 where c.id = x.id and c.numero is null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'categorias_numero_valido') then
    alter table public.categorias add constraint categorias_numero_valido check (numero between 1 and 99);
  end if;
end $$;
create unique index if not exists categorias_numero_uidx on public.categorias (numero);
alter table public.categorias alter column numero set not null;

-- Categoría nueva: siguiente número libre y el id (slug) a partir del nombre si no viene.
create or replace function public.asignar_numero_categoria()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext('categorias_numero'));
  if new.numero is null then
    select coalesce(max(numero), 0) + 1 into new.numero from public.categorias;
  end if;
  if new.numero > 99 then raise exception 'Ya hay 99 categorías: no se pueden crear más'; end if;
  if new.orden is null or new.orden = 0 then
    select coalesce(max(orden), 0) + 1 into new.orden from public.categorias;
  end if;
  return new;
end;
$$;

drop trigger if exists categorias_numero on public.categorias;
create trigger categorias_numero before insert on public.categorias
  for each row execute function public.asignar_numero_categoria();

drop policy if exists categorias_admin_insert on public.categorias;
create policy categorias_admin_insert on public.categorias for insert to authenticated
  with check ((select public.es_admin()));
drop policy if exists categorias_admin_update on public.categorias;
create policy categorias_admin_update on public.categorias for update to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));

-- ------------------------------------------------------------
-- 2. CÓDIGO DE PRODUCTO
-- ------------------------------------------------------------
alter table public.productos add column if not exists codigo text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'productos_codigo_formato') then
    alter table public.productos add constraint productos_codigo_formato check (codigo ~ '^[0-9]{6}$');
  end if;
end $$;
create unique index if not exists productos_codigo_uidx on public.productos (codigo);

-- Productos existentes: correlativo por categoría en el orden del catálogo.
update public.productos p
   set codigo = lpad(c.numero::text, 2, '0') || lpad(x.n::text, 4, '0')
  from (select id, categoria_id, row_number() over (partition by categoria_id order by orden, nombre, creado_en) as n
          from public.productos) x
  join public.categorias c on c.id = x.categoria_id
 where p.id = x.id and p.codigo is null;

alter table public.productos alter column codigo set not null;

create or replace function public.asignar_codigo_producto()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_numero int;
  v_sig int;
begin
  if tg_op = 'UPDATE' and new.categoria_id is not distinct from old.categoria_id then
    new.codigo := old.codigo; -- el código no se cambia a mano
    return new;
  end if;
  -- Bloquear la categoría evita que dos productos nuevos reciban el mismo correlativo.
  select numero into v_numero from public.categorias where id = new.categoria_id for update;
  if not found then raise exception 'Categoría no válida'; end if;
  select coalesce(max(right(codigo, 4)::int), 0) + 1 into v_sig
    from public.productos
   where left(codigo, 2) = lpad(v_numero::text, 2, '0');
  if v_sig > 9999 then raise exception 'La categoría ya tiene 9,999 productos'; end if;
  new.codigo := lpad(v_numero::text, 2, '0') || lpad(v_sig::text, 4, '0');
  return new;
end;
$$;

drop trigger if exists productos_codigo on public.productos;
create trigger productos_codigo before insert or update on public.productos
  for each row execute function public.asignar_codigo_producto();
