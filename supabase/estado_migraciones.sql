-- ============================================================
-- Solo para chequear: no crea ni modifica nada.
-- Dice cuáles migraciones ya están corridas en esta base (corrida = true).
-- Las que digan CORRER hay que correrlas EN ORDEN y volver a correr este archivo:
-- todo tiene que decir 'listo'.
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query > Run.
-- ============================================================

select migracion,
       corrida,
       case when corrida then 'listo' else 'CORRER' end as que_hacer
from (values
  ('0001_esquema_inicial',
    to_regclass('public.perfiles') is not null
    and to_regclass('public.pedidos') is not null
    and exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                where n.nspname = 'public' and p.proname = 'crear_pedido')
    and exists (select 1 from storage.buckets where id = 'comprobantes')),
  ('0002_catalogo_inicial',
    to_regclass('public.productos') is not null
    and (select count(*) from public.productos) > 0
    and exists (select 1 from public.configuracion)),
  ('0003_panel_admin',
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'productos' and column_name = 'costo')
    and exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                where n.nspname = 'public' and p.proname = 'admin_ajustar_stock')
    and exists (select 1 from storage.buckets where id = 'productos'))
) as t(migracion, corrida)
order by migracion;
