/*
 * Prueba las migraciones de supabase/migrations en un Postgres en memoria (PGlite), con una
 * simulación mínima de Supabase (auth.uid, roles anon/authenticated, storage).
 * Uso: npm run test:bd
 */
import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const dir = fileURLToPath(new URL("../supabase/migrations", import.meta.url));
const db = new PGlite();
const run = (sql) => db.exec(sql);
const q = async (sql, p) => (await db.query(sql, p)).rows;
let fallas = 0;
const ok = (c, m) => { if (!c) fallas++; console.log((c ? "OK   " : "FALLA") + " " + m); };

// --- Simulación mínima de Supabase ---
await run(`
create role anon nologin; create role authenticated nologin;
grant usage on schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;
create schema auth; grant usage on schema auth to anon, authenticated;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.uid', true), '')::uuid $$;
grant execute on function auth.uid() to anon, authenticated;
create schema storage; grant usage on schema storage to anon, authenticated;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
grant all on storage.objects to authenticated;
create function storage.foldername(name text) returns text[] language sql as $$ select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;
grant execute on function storage.foldername(text) to authenticated;
`);
let conPublicacion = true;
try { await run("create publication supabase_realtime;"); } catch { conPublicacion = false; console.log("aviso: publicación omitida en PGlite"); }
for (const archivo of readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) {
  let sql = readFileSync(dir + "/" + archivo, "utf8");
  if (!conPublicacion) sql = sql.replace(/alter publication supabase_realtime[^;]*;/g, "-- omitida");
  await run(sql);
  ok(true, archivo + " corre sin errores");
}
// Las migraciones idempotentes se pueden volver a correr (p. ej. si Supabase cortó por un bloqueo).
// (en orden: 0007 redefine _crear_pedido de 0005)
for (const archivo of ["0005_compras_cotizaciones_facturas.sql", "0006_materia_prima_produccion.sql", "0007_zonas_envio.sql", "0008_categorias_codigos.sql"]) {
  await run(readFileSync(dir + "/" + archivo, "utf8"));
  ok(true, archivo + " se puede volver a correr");
}
ok((await q("select count(*)::int n from public.productos"))[0].n === 43, "43 productos");

const U1 = "11111111-1111-1111-1111-111111111111", U2 = "22222222-2222-2222-2222-222222222222", AD = "33333333-3333-3333-3333-333333333333";
await run(`insert into auth.users (id,email,raw_user_meta_data) values ('${U1}','mafer@correo.com','{"nombre":"María Fernanda"}'),('${U2}','clinica@correo.com','{}'),('${AD}','admin@correo.com','{}');`);
ok((await q("select count(*)::int n from public.perfiles"))[0].n === 3, "el trigger crea los perfiles");
await run(`update public.perfiles set tipo_cliente='credito', limite_credito=5000 where id='${U2}'; update public.perfiles set rol='admin' where id='${AD}';`);

const como = async (uid, fn) => { await run(`set request.uid = '${uid}'; set role authenticated;`); try { return await fn(); } finally { await run("reset role; reset request.uid;"); } };
const vid = async (slug, clave) => (await q("select v.id from public.variantes v join public.productos p on p.id=v.producto_id where p.slug=$1 and v.clave=$2", [slug, clave]))[0].id;
const vLav = await vid("desinfectante-galon", "lavanda"), vCloro = await vid("cloro-galon", "unica"), vCit = await vid("desinfectante-litro", "citronella");
const contacto = JSON.stringify({ nombre: "María Fernanda Rápalo", correo: "mafer@correo.com", telefono: "9876-5432" });
const dirSPS = JSON.stringify({ departamento: "Cortés", ciudad: "San Pedro Sula", colonia: "Jardines del Valle", direccion: "5ta calle casa 12" });
const items = (arr) => JSON.stringify(arr.map(([v, c]) => ({ variante_id: v, cantidad: c })));

const cod = await como(U1, async () => (await q("select public.crear_pedido($1::jsonb,$2::jsonb,$3::jsonb,true) c", [items([[vLav, 2], [vCloro, 1]]), contacto, dirSPS]))[0].c);
let p = (await q("select * from public.pedidos where codigo=$1", [cod]))[0];
ok(p.estado === "esperando_pago" && p.zona_envio === "sps", `pedido ${cod}: esperando pago, zona SPS`);
ok(Number(p.subtotal) === 260 && Number(p.envio) === 60 && Number(p.total) === 320, `totales 260 + 60 = ${p.total}`);
let v = (await q("select stock, stock_apartado from public.variantes where id=$1", [vLav]))[0];
ok(v.stock === 30 && v.stock_apartado === 2, `stock apartado (${v.stock} / ${v.stock_apartado})`);
ok((await q("select count(*)::int n from public.direcciones where usuario_id=$1", [U1]))[0].n === 1, "dirección guardada");

try { await como(U1, () => q("select public.crear_pedido($1::jsonb,$2::jsonb,$3::jsonb)", [items([[vCit, 1]]), contacto, dirSPS])); ok(false, "agotado debía fallar"); }
catch (e) { ok(/No hay suficiente/.test(e.message), "agotado rechazado: " + e.message); }
try { await como(U1, () => q("select public.crear_pedido($1::jsonb,$2::jsonb,$3::jsonb)", [items([[vLav, 1]]), JSON.stringify({ nombre: "M", correo: "x", telefono: "1" }), dirSPS])); ok(false, "datos malos"); }
catch (e) { ok(/nombre/.test(e.message), "valida datos: " + e.message); }

ok((await como(U2, () => q("select count(*)::int n from public.pedidos")))[0].n === 0, "RLS: otro cliente no ve pedidos ajenos");
ok((await como(U1, () => q("select count(*)::int n from public.pedidos")))[0].n === 1, "RLS: el cliente ve su pedido");
ok((await como(U1, () => q("select count(*)::int n from public.productos")))[0].n === 43, "el catálogo es público");
try { await como(U1, () => q("select stock from public.variantes limit 1")); ok(false, "stock visible"); } catch { ok(true, "el público no puede leer el stock"); }
try { await como(U1, () => q(`update public.perfiles set tipo_cliente='credito' where id='${U1}'`)); ok(false, "cliente se dio crédito"); } catch (e) { ok(/permiso/.test(e.message), "un cliente no puede darse crédito"); }
try { await como(U1, () => q("select public.admin_confirmar_pago($1)", [p.id])); ok(false, "cliente confirmó"); } catch { ok(true, "un cliente no puede confirmar pagos"); }
try { await como(U1, () => q("select public.registrar_comprobante($1,$2)", [p.id, `${U2}/${p.id}/x.jpg`])); ok(false, "ruta ajena"); } catch { ok(true, "comprobante con ruta ajena rechazado"); }

await como(U1, () => q("select public.registrar_comprobante($1,$2)", [p.id, `${U1}/${p.id}/123-comprobante.jpg`]));
ok((await q("select estado from public.pedidos where id=$1", [p.id]))[0].estado === "pago_en_revision", "comprobante → pago en revisión");

await como(U1, () => q("insert into public.pedido_mensajes (pedido_id, texto) values ($1,'¿Me llaman al llegar?')", [p.id]));
ok(true, "el cliente escribe en el chat de su pedido");
try { await como(U2, () => q("insert into public.pedido_mensajes (pedido_id, texto) values ($1,'hola')", [p.id])); ok(false, "chat ajeno"); } catch { ok(true, "no se puede escribir en el chat de otro pedido"); }

await como(AD, () => q("select public.admin_confirmar_pago($1)", [p.id]));
v = (await q("select stock, stock_apartado from public.variantes where id=$1", [vLav]))[0];
ok(v.stock === 28 && v.stock_apartado === 0, `confirmar descuenta stock (${v.stock} / ${v.stock_apartado})`);
ok((await q("select count(*)::int n from public.movimientos_inventario where pedido_id=$1", [p.id]))[0].n === 6, "kardex: apartado + liberación + venta");

// Zonas de entrega (0007): el admin agrega Distrito Central / Tegucigalpa con envío de L 150.
const mDC = await como(AD, async () => (await q("insert into public.municipios (departamento, nombre, costo_envio) values ('Francisco Morazán', 'Distrito Central', 150) returning id"))[0].id);
await como(AD, () => q("insert into public.ciudades (municipio_id, nombre) values ($1, 'Tegucigalpa')", [mDC]));
ok(true, "el admin agrega municipios y ciudades");
// Sin municipio (direcciones viejas) se deduce por la ciudad.
const cod2 = await como(U2, async () => (await q("select public.crear_pedido($1::jsonb,$2::jsonb,$3::jsonb) c", [items([[vLav, 1]]), JSON.stringify({ nombre: "Clínica Santa Rosa", correo: "clinica@correo.com", telefono: "25501234" }), JSON.stringify({ departamento: "Francisco Morazán", ciudad: "Tegucigalpa", colonia: "Centro", direccion: "Ave. Cervantes" })]))[0].c);
p = (await q("select * from public.pedidos where codigo=$1", [cod2]))[0];
ok(p.estado === "confirmado" && p.zona_envio === "resto" && Number(p.total) === 245 && p.municipio === "Distrito Central", `crédito: confirmado, envío del municipio, total ${p.total}`);
ok(Number((await q("select saldo from public.perfiles where id=$1", [U2]))[0].saldo) === 245, "el crédito suma al saldo");
await como(AD, () => q("select public.admin_cancelar_pedido($1,'Cliente lo pidió')", [p.id]));
ok(Number((await q("select saldo from public.perfiles where id=$1", [U2]))[0].saldo) === 0, "cancelar un pedido a crédito resta el saldo");
ok((await q("select stock from public.variantes where id=$1", [vLav]))[0].stock === 28, "cancelar devuelve el stock");

// ---- 0003: panel admin ----
ok((await q("select count(*)::int n from public.movimientos_inventario where documento = 'Saldo inicial'"))[0].n > 0, "kardex con saldo inicial");
const inv = await como(AD, () => q("select stock from public.admin_inventario() where id = $1", [vLav]));
ok(inv[0].stock === 28, "el admin ve el stock con admin_inventario()");
try { await como(U1, () => q("select * from public.admin_inventario()")); ok(false, "cliente vio inventario"); } catch { ok(true, "un cliente no puede ver el inventario"); }
const nuevo = await como(AD, async () => (await q("insert into public.productos (slug, linea, nombre, nombre_base, tamano, categoria_id, precio) values ('limpia-pisos-galon', 'limpia-pisos', 'Limpia Pisos Galón', 'Limpia Pisos', 'Galón', 'hogar', 99) returning id"))[0].id);
ok(!!nuevo, "el admin crea un producto");
const vn = await como(AD, async () => (await q("insert into public.variantes (producto_id, clave, aroma_id, etiqueta, img, sku) values ($1, 'lavanda', 'lavanda', 'Lavanda', '/img/x.webp', 'LIMPIA-PISOS-GALON-LAVANDA') returning id", [nuevo]))[0].id);
ok(!!vn, "el admin crea una variante (aroma)");
try { await como(AD, () => q("update public.variantes set stock = 999 where id = $1", [vn])); ok(false, "stock editado a mano"); } catch { ok(true, "el stock no se puede editar a mano (solo con ajuste)"); }
await como(AD, () => q("select public.admin_ajustar_stock($1, 24, 'Saldo inicial')", [vn]));
ok((await q("select stock from public.variantes where id=$1", [vn]))[0].stock === 24, "ajuste de stock +24 con kardex");
try { await como(AD, () => q("select public.admin_ajustar_stock($1, -30, 'merma')", [vn])); ok(false, "stock negativo"); } catch (e) { ok(/negativo/.test(e.message), "el ajuste no deja stock negativo"); }
try { await como(U1, () => q("insert into public.productos (slug, linea, nombre, nombre_base, tamano, categoria_id) values ('x','x','x','x','x','hogar')")); ok(false, "cliente creó producto"); } catch { ok(true, "un cliente no puede crear productos"); }

// ---- 0004: abonos y descuentos ----
await como(AD, () => q("insert into public.codigos_descuento (codigo, porcentaje, minimo_compra) values ('MAYOREO10', 10, 200)"));
await como(AD, () => q("insert into public.codigos_descuento (codigo, porcentaje, cliente_id) values ('SOLOCLINICA', 15, $1)", [U2]));
const vd = await como(U1, () => q("select * from public.validar_descuento('mayoreo10', 300)"));
ok(Number(vd[0].porcentaje) === 10, "validar código (minúsculas) → 10 %");
try { await como(U1, () => q("select * from public.validar_descuento('MAYOREO10', 100)")); ok(false, "mínimo"); } catch (e) { ok(/desde L. 200/.test(e.message), "respeta la compra mínima: " + e.message); }
try { await como(U1, () => q("select * from public.validar_descuento('SOLOCLINICA', 300)")); ok(false, "código ajeno"); } catch (e) { ok(/no es válido para tu cuenta/.test(e.message), "código de otro cliente rechazado"); }
try { await como(U1, () => q("select * from public.codigos_descuento")); const r = await como(U1, () => q("select count(*)::int n from public.codigos_descuento")); ok(r[0].n === 0, "un cliente no puede listar los códigos"); } catch { ok(true, "un cliente no puede listar los códigos"); }
const cod3 = await como(U1, async () => (await q("select public.crear_pedido($1::jsonb,$2::jsonb,$3::jsonb,false,'MAYOREO10') c", [items([[vLav, 3]]), contacto, dirSPS]))[0].c);
const p3 = (await q("select * from public.pedidos where codigo=$1", [cod3]))[0];
ok(Number(p3.subtotal) === 285 && Number(p3.descuento) === 28.5 && Number(p3.total) === 316.5, `pedido con descuento: 285 − 28.50 + 60 = ${p3.total}`);
ok((await q("select usos from public.codigos_descuento where codigo='MAYOREO10'"))[0].usos === 1, "el código suma un uso");
await como(AD, () => q("select public.admin_cancelar_pedido($1,'Prueba')", [p3.id]));
ok((await q("select usos from public.codigos_descuento where codigo='MAYOREO10'"))[0].usos === 0, "cancelar devuelve el uso del código");
// Abonos
await como(U2, async () => (await q("select public.crear_pedido($1::jsonb,$2::jsonb,$3::jsonb,false,'SOLOCLINICA') c", [items([[vLav, 2]]), JSON.stringify({ nombre: "Clínica Santa Rosa", correo: "clinica@correo.com", telefono: "25501234" }), dirSPS]))[0].c);
const s0 = Number((await q("select saldo from public.perfiles where id=$1", [U2]))[0].saldo);
ok(s0 === 221.5, `crédito con descuento suma 190 − 28.50 + 60 = ${s0}`);
try { await como(AD, () => q("select public.admin_registrar_abono($1, 500, 'Efectivo', null)", [U2])); ok(false, "abono mayor"); } catch (e) { ok(/supera el saldo/.test(e.message), "no se puede abonar más que el saldo"); }
await como(AD, () => q("select public.admin_registrar_abono($1, 100, 'Transferencia', 'BAC 123')", [U2]));
ok(Number((await q("select saldo from public.perfiles where id=$1", [U2]))[0].saldo) === 121.5, "abono baja el saldo");
try { await como(U2, () => q("select public.admin_registrar_abono($1, 10, 'Efectivo', null)", [U2])); ok(false, "cliente abonó"); } catch { ok(true, "un cliente no puede registrarse abonos"); }
ok((await como(U2, () => q("select count(*)::int n from public.abonos")))[0].n === 1, "el cliente ve sus abonos");

// ---- 0005: compras, cotizaciones y facturas ----
const prov = await como(AD, async () => (await q("insert into public.proveedores (nombre, condiciones) values ('Químicos del Norte', 'Crédito 30 días') returning id"))[0].id);
const cmp = await como(AD, async () => (await q("insert into public.compras (proveedor_id, factura_proveedor) values ($1, '000-001-01-00000123') returning id, codigo", [prov]))[0]);
ok(cmp.codigo === "CMP-0001", "compra numerada " + cmp.codigo);
await como(AD, () => q("insert into public.compra_items (compra_id, variante_id, cantidad, costo_unitario) values ($1, $2, 50, 48.5)", [cmp.id, vLav]));
const antes = (await q("select stock from public.variantes where id=$1", [vLav]))[0].stock;
await como(AD, () => q("select public.admin_recibir_compra($1)", [cmp.id]));
ok((await q("select stock from public.variantes where id=$1", [vLav]))[0].stock === antes + 50, "recibir compra suma 50 al stock");
ok(Number((await q("select p.costo from public.productos p join public.variantes v on v.producto_id = p.id where v.id=$1", [vLav]))[0].costo) === 48.5, "actualiza el costo del producto");
try { await como(AD, () => q("update public.compra_items set cantidad = 99 where compra_id = $1", [cmp.id])); ok(false, "editó compra recibida"); } catch (e) { ok(/no se puede modificar/.test(e.message), "una compra recibida no se edita"); }
try { await como(AD, () => q("select public.admin_recibir_compra($1)", [cmp.id])); ok(false, "recibió dos veces"); } catch { ok(true, "no se recibe dos veces"); }
// Cotización → pedido (U1 tiene dirección guardada)
const cot = await como(AD, async () => (await q("insert into public.cotizaciones (cliente_id, valida_hasta, total) values ($1, current_date + 15, 190) returning id, codigo", [U1]))[0]);
await como(AD, () => q("insert into public.cotizacion_items (cotizacion_id, variante_id, descripcion, sku, cantidad, precio_unitario) values ($1, $2, 'Desinfectante', 'X', 2, 95)", [cot.id, vLav]));
const codCot = await como(AD, async () => (await q("select public.admin_convertir_cotizacion($1) c", [cot.id]))[0].c);
const pc = (await q("select * from public.pedidos where codigo=$1", [codCot]))[0];
ok(pc.usuario_id === U1 && pc.estado === "esperando_pago" && Number(pc.subtotal) === 190, "cotización → pedido del cliente con su regla (" + codCot + ")");
ok((await q("select estado from public.cotizaciones where id=$1", [cot.id]))[0].estado === "convertida", "cotización queda convertida");
try { await como(AD, () => q("select public.admin_convertir_cotizacion($1)", [cot.id])); ok(false, "convirtió dos veces"); } catch { ok(true, "no se convierte dos veces"); }
// Facturas
try { await como(AD, () => q("select public.admin_emitir_factura($1)", [pc.id])); ok(false, "facturó sin confirmar"); } catch (e) { ok(/confirmado/.test(e.message), "no se factura un pedido sin confirmar"); }
await como(AD, () => q("select public.admin_confirmar_pago($1)", [pc.id]));
const fac = await como(AD, async () => (await q("select public.admin_emitir_factura($1) c", [pc.id]))[0].c);
const fr = (await q("select * from public.facturas where codigo=$1", [fac]))[0];
ok(fac === "FAC-000001" && Number(fr.total) === 250 && Number(fr.gravado) === 217.39 && Number(fr.isv) === 32.61, `factura ${fac}: 250 = 217.39 + ISV 32.61`);
try { await como(AD, () => q("select public.admin_emitir_factura($1)", [pc.id])); ok(false, "dos facturas"); } catch (e) { ok(/ya tiene factura/.test(e.message), "un pedido no se factura dos veces"); }
ok((await como(U1, () => q("select count(*)::int n from public.facturas")))[0].n === 1, "el cliente ve su factura");
ok((await como(U2, () => q("select count(*)::int n from public.facturas")))[0].n === 0, "otro cliente no la ve");
try { await como(U1, () => q("select public.admin_emitir_factura($1)", [pc.id])); ok(false, "cliente facturó"); } catch { ok(true, "un cliente no puede emitir facturas"); }
await como(AD, () => q("select public.admin_anular_factura($1, 'Error en RTN')", [fr.id]));
const fac2 = await como(AD, async () => (await q("select public.admin_emitir_factura($1) c", [pc.id]))[0].c);
ok(fac2 === "FAC-000002", "anulada → se puede volver a facturar (" + fac2 + ")");

// ---- 0006: materia prima, reglas de creación y producción ----
const mp = async (codigo, nombre, unidad) => (await como(AD, () => q("insert into public.materias_primas (codigo, nombre, unidad) values ($1,$2,$3) returning id", [codigo, nombre, unidad])))[0].id;
const base = await mp("BASE-DES", "Base desinfectante", "kg");
const aroLav = await mp("ARO-LAV", "Aromatizante lavanda", "lb");
const colMor = await mp("COL-MOR", "Colorante morado", "lb");
try { await como(AD, () => q("update public.materias_primas set stock = 99 where id = $1", [base])); ok(false, "stock MP a mano"); } catch { ok(true, "el stock de materia prima no se edita a mano"); }
// Compra de materia prima (cantidades con decimales)
const cmp2 = await como(AD, async () => (await q("insert into public.compras (proveedor_id) values ($1) returning id", [prov]))[0].id);
await como(AD, () => q("insert into public.compra_items (compra_id, materia_id, cantidad, costo_unitario) values ($1,$2,20,30), ($1,$3,10.5,80), ($1,$4,10,40)", [cmp2, base, aroLav, colMor]));
await como(AD, () => q("select public.admin_recibir_compra($1)", [cmp2]));
ok(Number((await q("select stock from public.materias_primas where id=$1", [aroLav]))[0].stock) === 10.5, "comprar materia prima suma 10.5 lb");
ok(Number((await q("select costo_unitario from public.materias_primas where id=$1", [base]))[0].costo_unitario) === 30, "guarda el costo de la materia prima");
try { await como(AD, () => q("insert into public.compra_items (compra_id, variante_id, cantidad, costo_unitario) values ($1,$2,1.5,10)", [cmp2, vLav])); ok(false, "decimal en producto"); } catch { ok(true, "un producto de reventa no admite cantidades con decimales"); }
// Regla: 1 lote rinde 4 galones con 2 kg de base, 0.5 lb de aroma y 0.2 lb de colorante
const rec = await como(AD, async () => (await q("insert into public.recetas (variante_id, rendimiento) values ($1, 4) returning id", [vLav]))[0].id);
await como(AD, () => q("insert into public.receta_ingredientes (receta_id, materia_id, cantidad) values ($1,$2,2), ($1,$3,0.5), ($1,$4,0.2)", [rec, base, aroLav, colMor]));
const stockAntes = (await q("select stock from public.variantes where id=$1", [vLav]))[0].stock;
const prd = await como(AD, async () => (await q("select public.admin_producir($1, 12, 'Lote de prueba') c", [vLav]))[0].c);
ok(prd === "PRD-0001", "producción numerada " + prd);
ok((await q("select stock from public.variantes where id=$1", [vLav]))[0].stock === stockAntes + 12, "producir suma 12 galones al inventario de la tienda");
ok(Number((await q("select stock from public.materias_primas where id=$1", [base]))[0].stock) === 14, "descuenta 6 kg de base (20 → 14)");
ok(Number((await q("select stock from public.materias_primas where id=$1", [aroLav]))[0].stock) === 9, "descuenta 1.5 lb de aroma (10.5 → 9)");
const pr = (await q("select * from public.producciones where codigo=$1", [prd]))[0];
ok(Number(pr.costo_total) === 324 && Number(pr.costo_unitario) === 27, `costo de producción 6×30 + 1.5×80 + 0.6×40 = ${pr.costo_total} (27 por galón)`);
ok(Number((await q("select p.costo from public.productos p join public.variantes v on v.producto_id=p.id where v.id=$1", [vLav]))[0].costo) === 27, "el costo del producto pasa a ser el de producción");
try { await como(AD, () => q("select public.admin_producir($1, 1000)", [vLav])); ok(false, "produjo sin materia"); } catch (e) { ok(/^Falta materia prima: /.test(e.message) && e.message.includes("Base desinfectante (hay 14 kg"), "sin materia suficiente no produce: " + e.message.slice(0, 80)); }
ok(Number((await q("select stock from public.materias_primas where id=$1", [base]))[0].stock) === 14, "un intento fallido no descuenta nada");
try { await como(AD, () => q("select public.admin_producir($1, 1)", [vCloro])); ok(false, "sin receta"); } catch (e) { ok(/no tiene regla/.test(e.message), "sin regla de creación no produce"); }
try { await como(U1, () => q("select public.admin_producir($1, 1)", [vLav])); ok(false, "cliente produjo"); } catch { ok(true, "un cliente no puede producir"); }

// ---- 0007: zonas de entrega y envío gratis ----
try { await como(U1, () => q("insert into public.municipios (departamento, nombre) values ('Cortés', 'Choloma')")); ok(false, "cliente creó municipio"); } catch { ok(true, "un cliente no puede crear municipios"); }
const dirCholoma = JSON.stringify({ departamento: "Cortés", municipio: "Choloma", ciudad: "Choloma", colonia: "Centro", direccion: "Casa 1" });
try { await como(U1, () => q("select public.crear_pedido($1::jsonb,$2::jsonb,$3::jsonb)", [items([[vLav, 1]]), contacto, dirCholoma])); ok(false, "pedido fuera de zona"); } catch (e) { ok(/no entregamos/.test(e.message), "fuera de la lista no se puede pedir"); }
const dirSPS2 = JSON.stringify({ departamento: "Cortés", municipio: "San Pedro Sula", ciudad: "san pedro sula", colonia: "Trejo", direccion: "Casa 2" });
await q("update public.configuracion set envio_gratis_desde = 95");
const codG1 = await como(U1, async () => (await q("select public.crear_pedido($1::jsonb,$2::jsonb,$3::jsonb) c", [items([[vLav, 1]]), contacto, dirSPS2]))[0].c);
let pg = (await q("select * from public.pedidos where codigo=$1", [codG1]))[0];
ok(Number(pg.envio) === 60 && pg.ciudad === "San Pedro Sula", `compra igual al mínimo paga envío (${pg.envio}) y la ciudad queda con el nombre de la lista`);
await q("update public.configuracion set envio_gratis_desde = 94.99");
const codG2 = await como(U1, async () => (await q("select public.crear_pedido($1::jsonb,$2::jsonb,$3::jsonb) c", [items([[vLav, 1]]), contacto, dirSPS2]))[0].c);
pg = (await q("select * from public.pedidos where codigo=$1", [codG2]))[0];
ok(Number(pg.envio) === 0 && Number(pg.total) === Number(pg.subtotal), "compra mayor al mínimo: envío gratis");
await como(AD, () => q("update public.municipios set activo = false where id = $1", [mDC]));
ok((await como(U1, () => q("select count(*)::int n from public.municipios")))[0].n === 1, "el cliente solo ve municipios activos");
try { await como(U2, () => q("select public.crear_pedido($1::jsonb,$2::jsonb,$3::jsonb)", [items([[vLav, 1]]), contacto, JSON.stringify({ departamento: "Francisco Morazán", municipio: "Distrito Central", ciudad: "Tegucigalpa", colonia: "Centro", direccion: "Ave. Cervantes" })])); ok(false, "municipio inactivo"); } catch { ok(true, "un municipio desactivado ya no recibe pedidos"); }

// ---- 0008: categorías y códigos de producto ----
const codP = async (slug) => (await q("select codigo from public.productos where slug=$1", [slug]))[0].codigo;
ok(await codP("desinfectante-galon") === "010001", "el primer producto de la categoría 01 es 010001");
ok((await q("select count(*)::int n from public.productos where codigo is null"))[0].n === 0 && (await q("select count(distinct codigo)::int n, count(*)::int t from public.productos"))[0].n === (await q("select count(*)::int t from public.productos"))[0].t, "todos los productos tienen código único");
ok(/^01[0-9]{4}$/.test(await codP("limpia-pisos-galon")), "un producto nuevo recibe el siguiente código de su categoría");
await como(AD, () => q("insert into public.categorias (id, nombre, corto) values ('industrial', 'Línea industrial', 'Industrial')"));
const numInd = (await q("select numero from public.categorias where id='industrial'"))[0].numero;
ok(numInd === 9, "la categoría nueva recibe el número 09");
await como(AD, () => q("insert into public.productos (slug, linea, nombre, nombre_base, tamano, categoria_id, precio) values ('ind-1','ind','Ind 1','Ind','Galón','industrial',10), ('ind-2','ind','Ind 2','Ind','Litro','industrial',5)"));
ok(await codP("ind-1") === "090001" && await codP("ind-2") === "090002", "correlativo dentro de la categoría: 090001, 090002");
await como(AD, () => q("update public.productos set categoria_id='hogar' where slug='ind-2'"));
ok((await codP("ind-2")).startsWith("01"), "al cambiar de categoría recibe código de la nueva");
await como(AD, () => q("update public.productos set codigo='999999', precio=11 where slug='ind-1'"));
ok(await codP("ind-1") === "090001", "el código no se cambia a mano");
try { await como(U1, () => q("insert into public.categorias (id, nombre, corto) values ('x','X','X')")); ok(false, "cliente creó categoría"); } catch { ok(true, "un cliente no puede crear categorías"); }

console.log(fallas ? `\n${fallas} FALLAS` : "\nTodo OK");
await db.close();
if (fallas) process.exit(1);
