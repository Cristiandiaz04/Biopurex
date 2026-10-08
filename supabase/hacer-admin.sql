-- ============================================================
-- Vuelve administrador a una cuenta ya registrada en la tienda.
-- 1. La persona se registra en la tienda (Crear cuenta).
-- 2. Cambia TU_CORREO por su correo y corre esto en el SQL Editor.
-- ============================================================
update public.perfiles set rol = 'admin' where correo = lower('TU_CORREO');

select id, nombre, correo, rol from public.perfiles where correo = lower('TU_CORREO');
