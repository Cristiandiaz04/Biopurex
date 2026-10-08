-- ============================================================
-- BIOPUREX · 0011 · Secciones de productos del inicio, editables desde el panel
-- Pedido de Cristian (2026-10-08): el admin elige qué productos se exhiben en el inicio
-- ("Más vendidos", "Nuevos", "Línea automotriz"…), en qué orden y con qué título.
-- - inicio_secciones: título, texto, modo (manual / más vendidos / nuevos), cantidad, tema,
--   enlace "Ver todo" a una categoría, activa y orden.
-- - inicio_productos: en modo manual, qué variantes (producto + aroma) y en qué orden.
-- - inicio_mas_vendidos(): variantes más vendidas (solo ids y cantidades, sin datos de clientes).
-- Se puede volver a correr sin problema (es idempotente).
-- Ejecutar DESPUÉS de 0010. Verificar con supabase/estado_migraciones.sql.
-- ============================================================

set lock_timeout = '10s';

create table if not exists public.inicio_secciones (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (char_length(btrim(titulo)) between 2 and 60),
  descripcion text check (descripcion is null or char_length(descripcion) <= 300),
  modo text not null default 'manual' check (modo in ('manual', 'mas_vendidos', 'nuevos')),
  cantidad int not null default 4 check (cantidad between 1 and 12),
  tema text not null default 'claro' check (tema in ('claro', 'oscuro')),
  categoria_id text references public.categorias (id) on delete set null,
  activa boolean not null default true,
  orden int not null default 0,
  creado_en timestamptz not null default now()
);

create table if not exists public.inicio_productos (
  seccion_id uuid not null references public.inicio_secciones (id) on delete cascade,
  variante_id uuid not null references public.variantes (id) on delete cascade,
  orden int not null default 0,
  primary key (seccion_id, variante_id)
);

alter table public.inicio_secciones enable row level security;
alter table public.inicio_productos enable row level security;

drop policy if exists inicio_secciones_select on public.inicio_secciones;
create policy inicio_secciones_select on public.inicio_secciones for select to anon, authenticated
  using (activa or (select public.es_admin()));
drop policy if exists inicio_secciones_admin on public.inicio_secciones;
create policy inicio_secciones_admin on public.inicio_secciones for all to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));

drop policy if exists inicio_productos_select on public.inicio_productos;
create policy inicio_productos_select on public.inicio_productos for select to anon, authenticated using (true);
drop policy if exists inicio_productos_admin on public.inicio_productos;
create policy inicio_productos_admin on public.inicio_productos for all to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));

-- Variantes más vendidas (pedidos confirmados, enviados o entregados). Solo devuelve ids y
-- cantidades: el público puede usarla sin ver pedidos de nadie.
create or replace function public.inicio_mas_vendidos(p_limite int default 12)
returns table (variante_id uuid, unidades bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select i.variante_id, sum(i.cantidad)::bigint as unidades
    from public.pedido_items i
    join public.pedidos p on p.id = i.pedido_id
    join public.variantes v on v.id = i.variante_id and v.activo
    join public.productos pr on pr.id = v.producto_id and pr.activo
   where p.estado in ('confirmado', 'enviado', 'entregado')
   group by i.variante_id
   order by unidades desc
   limit least(greatest(coalesce(p_limite, 12), 1), 24);
$$;

revoke all on function public.inicio_mas_vendidos(int) from public;
grant execute on function public.inicio_mas_vendidos(int) to anon, authenticated;

-- Secciones iniciales = lo que ya mostraba el inicio (solo la primera vez).
do $$
declare
  v_sec uuid;
begin
  if exists (select 1 from public.inicio_secciones) then return; end if;

  insert into public.inicio_secciones (titulo, modo, cantidad, tema, orden)
  values ('Más vendidos', 'manual', 4, 'claro', 1) returning id into v_sec;
  insert into public.inicio_productos (seccion_id, variante_id, orden)
  select v_sec, x.vid, x.ord
    from (
      select distinct on (p.slug) v.id as vid, array_position(array['desinfectante-galon', 'biowash', 'jabon-manos', 'biosoft'], p.slug) as ord
        from public.productos p join public.variantes v on v.producto_id = p.id
       where p.slug = any (array['desinfectante-galon', 'biowash', 'jabon-manos', 'biosoft']) and v.activo
       order by p.slug, v.orden
    ) x;

  insert into public.inicio_secciones (titulo, descripcion, modo, cantidad, tema, categoria_id, orden)
  values ('Línea automotriz', 'Shampoo, abrillantadores y desengrasantes para tu vehículo o tu carwash, en 740 ml, galón y 20 litros.',
          'manual', 4, 'oscuro', (select id from public.categorias where id = 'auto'), 2)
  returning id into v_sec;
  insert into public.inicio_productos (seccion_id, variante_id, orden)
  select v_sec, x.vid, x.ord
    from (
      select distinct on (p.slug) v.id as vid, array_position(array['biofoam-galon', 'shampoo-carros-galon', 'llantas-galon', 'tableros-galon'], p.slug) as ord
        from public.productos p join public.variantes v on v.producto_id = p.id
       where p.slug = any (array['biofoam-galon', 'shampoo-carros-galon', 'llantas-galon', 'tableros-galon']) and v.activo
       order by p.slug, v.orden
    ) x;

  -- Lista para activar desde el panel cuando haya productos marcados como "Nuevo".
  insert into public.inicio_secciones (titulo, modo, cantidad, tema, activa, orden)
  values ('Nuevos', 'nuevos', 4, 'claro', false, 3);
end $$;
