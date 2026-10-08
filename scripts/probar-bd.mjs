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

const cod2 = await como(U2, async () => (await q("select public.crear_pedido($1::jsonb,$2::jsonb,$3::jsonb) c", [items([[vLav, 1]]), JSON.stringify({ nombre: "Clínica Santa Rosa", correo: "clinica@correo.com", telefono: "25501234" }), JSON.stringify({ departamento: "Francisco Morazán", ciudad: "Tegucigalpa", colonia: "Centro", direccion: "Ave. Cervantes" })]))[0].c);
p = (await q("select * from public.pedidos where codigo=$1", [cod2]))[0];
ok(p.estado === "confirmado" && p.zona_envio === "resto" && Number(p.total) === 245, `crédito: confirmado, resto del país, total ${p.total}`);
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

console.log(fallas ? `\n${fallas} FALLAS` : "\nTodo OK");
await db.close();
if (fallas) process.exit(1);
