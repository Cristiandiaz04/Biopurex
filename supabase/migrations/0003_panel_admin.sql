-- ============================================================
-- BIOPUREX · 0003 · Panel admin (fase 3a)
-- Crear/editar productos, aromas y variantes (solo admin), costo, inventario con stock para el
-- admin, ajuste de stock con kardex, saldo inicial en el kardex y bucket público de fotos.
-- Ejecutar DESPUÉS de 0001 y 0002. Verificar con supabase/estado_migraciones.sql.
-- ============================================================

-- 1. Costo por producto (presentación) para valorizar inventario y reportes.
alter table public.productos add column if not exists costo numeric(12, 2) check (costo is null or costo >= 0);

-- 2. Movimiento 'ajuste' (cantidad con signo) en el kardex.
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
  elsif p_tipo in ('devolucion', 'entrada', 'ajuste') then
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

-- 3. Escritura del catálogo: solo admin.
create policy productos_admin_insert on public.productos for insert to authenticated
  with check ((select public.es_admin()));
create policy productos_admin_update on public.productos for update to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));

create policy aromas_admin_insert on public.aromas for insert to authenticated
  with check ((select public.es_admin()));
create policy aromas_admin_update on public.aromas for update to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));

-- Variantes: el admin crea y edita, pero el stock solo cambia con funciones (queda en el kardex).
revoke insert, update on public.variantes from anon, authenticated;
grant insert (producto_id, clave, aroma_id, etiqueta, img, sku, stock_minimo, activo, orden)
  on public.variantes to authenticated;
grant update (clave, aroma_id, etiqueta, img, sku, stock_minimo, activo, orden)
  on public.variantes to authenticated;
create policy variantes_admin_insert on public.variantes for insert to authenticated
  with check ((select public.es_admin()));
create policy variantes_admin_update on public.variantes for update to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));

-- 4. Inventario completo (con stock) para el admin.
create or replace function public.admin_inventario()
returns setof public.variantes
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.es_admin() then raise exception 'Solo el administrador'; end if;
  return query select * from public.variantes;
end;
$$;

revoke all on function public.admin_inventario() from public, anon;
grant execute on function public.admin_inventario() to authenticated;

-- 5. Ajuste de stock manual (conteo, merma, saldo inicial de un producto nuevo).
create or replace function public.admin_ajustar_stock(p_variante uuid, p_cantidad int, p_nota text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_stock int;
begin
  if not public.es_admin() then raise exception 'Solo el administrador'; end if;
  if p_cantidad is null or p_cantidad = 0 then raise exception 'Indica una cantidad distinta de cero'; end if;
  if char_length(btrim(coalesce(p_nota, ''))) < 3 then raise exception 'Escribe el motivo del ajuste'; end if;
  select stock into v_stock from public.variantes where id = p_variante for update;
  if not found then raise exception 'Variante no encontrada'; end if;
  if v_stock + p_cantidad < 0 then raise exception 'El stock no puede quedar negativo (hay %)', v_stock; end if;
  perform public._mover_stock(p_variante, case when p_cantidad > 0 then 'entrada' else 'ajuste' end, p_cantidad, null, 'Ajuste');
  update public.movimientos_inventario set nota = btrim(p_nota)
   where id = (select id from public.movimientos_inventario where variante_id = p_variante order by creado_en desc limit 1);
end;
$$;

revoke all on function public.admin_ajustar_stock(uuid, int, text) from public, anon;
grant execute on function public.admin_ajustar_stock(uuid, int, text) to authenticated;

-- 6. Saldo inicial en el kardex del stock que cargó 0002 (una sola vez).
insert into public.movimientos_inventario (variante_id, tipo, cantidad, stock_resultante, apartado_resultante, documento, nota, creado_por)
select v.id, 'entrada', v.stock, v.stock, v.stock_apartado, 'Saldo inicial', 'Carga inicial del catálogo', null
  from public.variantes v
 where v.stock > 0
   and not exists (select 1 from public.movimientos_inventario m where m.variante_id = v.id);

-- 7. Fotos de productos (bucket público; solo el admin sube).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('productos', 'productos', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy productos_fotos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'productos' and (select public.es_admin()));
create policy productos_fotos_update on storage.objects for update to authenticated
  using (bucket_id = 'productos' and (select public.es_admin()));
