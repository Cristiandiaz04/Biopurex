"use server";

import { revalidatePath, updateTag } from "next/cache";
import { esAroma } from "@/lib/catalogo";
import { notificarPedido, type EventoPedido } from "@/lib/correo-pedidos";
import { exigirAdmin } from "@/lib/datos/admin";
import { registrar, registrarError } from "@/lib/log";

export type Resultado = { ok?: string; error?: string; errores?: Record<string, string>; slug?: string };

const UUID = /^[0-9a-f-]{36}$/i;

function fallo(contexto: string, error: { code?: string; message: string }): Resultado {
  registrarError(contexto, error);
  // P0001 = raise exception de nuestras funciones: mensaje escrito para el usuario.
  return { error: error.code === "P0001" ? error.message : "No se pudo completar la acción. Intenta de nuevo." };
}

// ---------------------------------------------------------------------------
// Pedidos
// ---------------------------------------------------------------------------

/** Correo que recibe el cliente después de cada acción del admin. */
const CORREO: Record<string, EventoPedido> = {
  admin_confirmar_pago: "confirmado",
  admin_problema_pago: "problema_pago",
  admin_marcar_enviado: "enviado",
  admin_marcar_entregado: "entregado",
  admin_cancelar_pedido: "cancelado",
};

async function accionPedido(
  rpc: "admin_confirmar_pago" | "admin_problema_pago" | "admin_marcar_enviado" | "admin_marcar_entregado" | "admin_cancelar_pedido",
  args: Record<string, unknown>,
  codigo: string,
  ok: string,
): Promise<Resultado> {
  const { supabase } = await exigirAdmin();
  const { error } = await supabase.rpc(rpc, args);
  if (error) return fallo(rpc, error);
  registrar(`pedido_${CORREO[rpc]}`, { codigo });
  await notificarPedido(supabase, codigo, CORREO[rpc]);
  revalidatePath(`/admin/pedidos/${codigo}`);
  revalidatePath("/admin/pedidos");
  revalidatePath(`/pedidos/${codigo}`);
  updateTag("catalogo");
  return { ok };
}

export async function confirmarPago(pedidoId: string, codigo: string) {
  if (!UUID.test(pedidoId)) return { error: "Pedido no válido" };
  return accionPedido("admin_confirmar_pago", { p_pedido: pedidoId }, codigo, "Pago confirmado");
}

export async function problemaPago(pedidoId: string, codigo: string, motivo: string) {
  if (!UUID.test(pedidoId)) return { error: "Pedido no válido" };
  const m = motivo.trim().slice(0, 300);
  if (m.length < 3) return { error: "Elige qué problema tiene el pago" };
  return accionPedido("admin_problema_pago", { p_pedido: pedidoId, p_motivo: m }, codigo, "Se avisó al cliente del problema con el pago");
}

export async function marcarEnviado(pedidoId: string, codigo: string) {
  if (!UUID.test(pedidoId)) return { error: "Pedido no válido" };
  return accionPedido("admin_marcar_enviado", { p_pedido: pedidoId }, codigo, "Pedido marcado como enviado");
}

export async function marcarEntregado(pedidoId: string, codigo: string, metodo: string | null) {
  if (!UUID.test(pedidoId)) return { error: "Pedido no válido" };
  if (metodo && !["efectivo", "tarjeta", "transferencia"].includes(metodo)) return { error: "Forma de cobro no válida" };
  return accionPedido("admin_marcar_entregado", { p_pedido: pedidoId, p_metodo: metodo }, codigo, "Pedido entregado");
}

export async function cancelarPedido(pedidoId: string, codigo: string, motivo: string) {
  if (!UUID.test(pedidoId)) return { error: "Pedido no válido" };
  const m = motivo.trim().slice(0, 300);
  if (m.length < 3) return { error: "Elige el motivo de la cancelación" };
  return accionPedido("admin_cancelar_pedido", { p_pedido: pedidoId, p_motivo: m }, codigo, "Pedido cancelado");
}

export async function enviarMensajeAdmin(pedidoId: string, texto: string): Promise<Resultado & { mensaje?: { id: string; texto: string; deAdmin: boolean; creadoEn: string } }> {
  const t = texto.trim();
  if (!UUID.test(pedidoId) || !t || t.length > 1000) return { error: "Mensaje no válido" };
  const { supabase, perfil } = await exigirAdmin();
  const { data, error } = await supabase
    .from("pedido_mensajes")
    .insert({ pedido_id: pedidoId, texto: t, de_admin: true, autor_id: perfil.id })
    .select("id, texto, de_admin, creado_en")
    .single();
  if (error) return fallo("enviarMensajeAdmin", error);
  return { ok: "Enviado", mensaje: { id: data.id, texto: data.texto, deAdmin: data.de_admin, creadoEn: data.creado_en } };
}

// ---------------------------------------------------------------------------
// Productos
// ---------------------------------------------------------------------------

export type DatosProducto = {
  id?: string;
  nombreBase: string;
  tamano: string;
  linea?: string;
  categoria: string;
  precio: string;
  costo: string;
  descripcion: string;
  beneficios: string;
  modoUso: string;
  seguridad: boolean;
  cotizar: boolean;
  masVendido: boolean;
  nuevo: boolean;
  tinte: string;
  activo: boolean;
};

const TAMANOS_EN_NOMBRE = new Set(["Galón", "Litro", "740 ml", "20 L"]);

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);

const lineas = (s: string) =>
  s
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 12);

function dinero(s: string): number | null | "error" {
  const t = s.trim().replace(/,/g, "");
  if (!t) return null;
  const v = Number(t);
  return Number.isFinite(v) && v >= 0 && v < 1e9 ? Math.round(v * 100) / 100 : "error";
}

export async function guardarProducto(d: DatosProducto): Promise<Resultado> {
  const errores: Record<string, string> = {};
  const nombreBase = d.nombreBase.trim();
  const tamano = d.tamano.trim();
  if (nombreBase.length < 3 || nombreBase.length > 120) errores.nombreBase = "Escribe el nombre del producto";
  if (tamano.length < 1 || tamano.length > 40) errores.tamano = "Indica la presentación (Galón, Litro, 740 ml…)";
  if (!/^[a-z0-9-]{1,60}$/.test(d.categoria)) errores.categoria = "Elige una categoría";
  const precio = dinero(d.precio);
  const costo = dinero(d.costo);
  if (precio === "error") errores.precio = "Precio no válido";
  if (costo === "error") errores.costo = "Costo no válido";
  if (precio === null && !d.cotizar) errores.precio = "Pon un precio o marca “Se vende por cotización”";
  if (d.descripcion.length > 1500) errores.descripcion = "Máximo 1500 caracteres";
  if (d.tinte && !esAroma(d.tinte)) errores.tinte = "Color no válido";
  if (d.id && !UUID.test(d.id)) return { error: "Producto no válido" };
  if (Object.keys(errores).length) return { error: "Revisa los campos marcados.", errores };

  const { supabase } = await exigirAdmin();
  const nombre = TAMANOS_EN_NOMBRE.has(tamano) ? `${nombreBase} ${tamano}` : nombreBase;
  const fila = {
    nombre,
    nombre_base: nombreBase,
    tamano,
    categoria_id: d.categoria,
    precio: precio as number | null,
    costo: costo as number | null,
    descripcion: d.descripcion.trim(),
    beneficios: lineas(d.beneficios),
    modo_uso: lineas(d.modoUso),
    seguridad: d.seguridad,
    cotizar: d.cotizar,
    insignias: [...(d.masVendido ? ["mas"] : []), ...(d.nuevo ? ["nuevo"] : [])],
    tinte: d.tinte || null,
    activo: d.activo,
  };

  let slug: string;
  if (d.id) {
    const { data, error } = await supabase.from("productos").update(fila).eq("id", d.id).select("slug").single();
    if (error) return fallo("guardarProducto", error);
    slug = data.slug;
  } else {
    // Producto nuevo (o nueva presentación de una línea existente).
    const linea = d.linea ? slugify(d.linea) : slugify(nombreBase);
    slug = slugify(`${linea}-${tamano}`);
    const { data: existe } = await supabase.from("productos").select("slug").like("slug", `${slug}%`);
    if (existe?.some((x) => x.slug === slug)) slug = `${slug}-${(existe?.length ?? 0) + 1}`;
    const { data: ultimo } = await supabase.from("productos").select("orden").order("orden", { ascending: false }).limit(1).maybeSingle();
    const { error } = await supabase.from("productos").insert({ ...fila, slug, linea, orden: (ultimo?.orden ?? 0) + 1 });
    if (error) return fallo("guardarProducto", error);
  }

  updateTag("catalogo");
  revalidatePath("/admin/productos");
  return { ok: d.id ? "Producto guardado" : "Producto creado", slug };
}

export type DatosVariante = {
  id?: string;
  productoId: string;
  aroma: string;
  etiqueta: string;
  img: string;
  sku: string;
  minimo: string;
  activo: boolean;
  stockInicial?: string;
};

export async function guardarVariante(d: DatosVariante, slugProducto: string): Promise<Resultado> {
  const errores: Record<string, string> = {};
  if (!UUID.test(d.productoId) || (d.id && !UUID.test(d.id))) return { error: "Datos no válidos" };
  if (d.aroma && !esAroma(d.aroma)) errores.aroma = "Aroma no válido";
  const etiqueta = d.etiqueta.trim();
  if (etiqueta.length < 1 || etiqueta.length > 60) errores.etiqueta = "Escribe el nombre que verá el cliente";
  const img = d.img.trim();
  if (!/^(\/img\/[\w.-]+|https:\/\/[\w.-]+\.supabase\.co\/storage\/v1\/object\/public\/productos\/[\w./-]+)$/.test(img)) errores.img = "Sube una foto";
  const sku = d.sku.trim().toUpperCase();
  if (!/^[A-Z0-9-]{3,60}$/.test(sku)) errores.sku = "SKU: letras, números y guiones";
  const minimo = Number(d.minimo);
  if (!Number.isInteger(minimo) || minimo < 0 || minimo > 100000) errores.minimo = "Número entero";
  const inicial = d.stockInicial?.trim() ? Number(d.stockInicial) : 0;
  if (!Number.isInteger(inicial) || inicial < 0 || inicial > 100000) errores.stockInicial = "Número entero";
  if (Object.keys(errores).length) return { error: "Revisa los campos marcados.", errores };

  const { supabase } = await exigirAdmin();
  const fila = { aroma_id: d.aroma || null, etiqueta, img, sku, stock_minimo: minimo, activo: d.activo };

  if (d.id) {
    const { error } = await supabase.from("variantes").update(fila).eq("id", d.id);
    if (error) return fallo("guardarVariante", error.code === "23505" ? { message: "Ese SKU ya existe", code: "P0001" } : error);
  } else {
    const { data: hermanas } = await supabase.from("variantes").select("clave, orden").eq("producto_id", d.productoId);
    let clave = d.aroma || "unica";
    if (hermanas?.some((h) => h.clave === clave)) clave = `${clave}-${(hermanas?.length ?? 0) + 1}`;
    const orden = Math.max(-1, ...(hermanas ?? []).map((h) => h.orden)) + 1;
    const { data, error } = await supabase
      .from("variantes")
      .insert({ ...fila, producto_id: d.productoId, clave, orden })
      .select("id")
      .single();
    if (error) return fallo("guardarVariante", error.code === "23505" ? { message: "Ese SKU ya existe", code: "P0001" } : error);
    if (inicial > 0) {
      const { error: e2 } = await supabase.rpc("admin_ajustar_stock", { p_variante: data.id, p_cantidad: inicial, p_nota: "Saldo inicial" });
      if (e2) return fallo("stockInicial", e2);
    }
  }

  updateTag("catalogo");
  revalidatePath(`/admin/productos/${slugProducto}`);
  return { ok: d.id ? "Aroma guardado" : "Aroma agregado" };
}

export async function ajustarStock(varianteId: string, cantidad: number, nota: string, slugProducto: string): Promise<Resultado> {
  if (!UUID.test(varianteId) || !Number.isInteger(cantidad) || cantidad === 0 || Math.abs(cantidad) > 100000) {
    return { error: "Indica una cantidad entera distinta de cero" };
  }
  const { supabase } = await exigirAdmin();
  const { error } = await supabase.rpc("admin_ajustar_stock", { p_variante: varianteId, p_cantidad: cantidad, p_nota: nota.trim().slice(0, 200) });
  if (error) return fallo("ajustarStock", error);
  updateTag("catalogo");
  revalidatePath(`/admin/productos/${slugProducto}`);
  revalidatePath("/admin/productos");
  return { ok: "Stock actualizado" };
}

// ---------------------------------------------------------------------------
// Clientes, abonos y descuentos
// ---------------------------------------------------------------------------

export async function actualizarCliente(id: string, tipo: string, limite: string): Promise<Resultado> {
  if (!UUID.test(id)) return { error: "Cliente no válido" };
  if (!["normal", "contra_entrega", "credito"].includes(tipo)) return { error: "Etiqueta no válida" };
  const lim = dinero(limite || "0");
  if (lim === "error" || lim === null) return { error: "Límite de crédito no válido", errores: { limite: "Monto no válido" } };
  const { supabase } = await exigirAdmin();
  const { error } = await supabase.from("perfiles").update({ tipo_cliente: tipo, limite_credito: lim }).eq("id", id);
  if (error) return fallo("actualizarCliente", error);
  revalidatePath(`/admin/clientes/${id}`);
  revalidatePath("/admin/clientes");
  return { ok: "Cliente actualizado" };
}

export async function registrarAbono(clienteId: string, monto: string, metodo: string, referencia: string): Promise<Resultado> {
  if (!UUID.test(clienteId)) return { error: "Cliente no válido" };
  const m = dinero(monto);
  if (m === "error" || m === null || m <= 0) return { error: "Escribe un monto mayor que cero" };
  if (!["Transferencia", "Depósito", "Cheque", "Efectivo"].includes(metodo)) return { error: "Método no válido" };
  const { supabase } = await exigirAdmin();
  const { error } = await supabase.rpc("admin_registrar_abono", {
    p_cliente: clienteId,
    p_monto: m,
    p_metodo: metodo,
    p_referencia: referencia.trim().slice(0, 80),
  });
  if (error) return fallo("registrarAbono", error);
  revalidatePath(`/admin/clientes/${clienteId}`);
  revalidatePath("/admin/cuentas");
  return { ok: "Abono registrado" };
}

export type DatosDescuento = {
  id?: string;
  codigo: string;
  porcentaje: string;
  descripcion: string;
  clienteId: string;
  minimoCompra: string;
  validoHasta: string;
  usosMaximos: string;
  activo: boolean;
};

export async function guardarDescuento(d: DatosDescuento): Promise<Resultado> {
  const errores: Record<string, string> = {};
  const codigo = d.codigo.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,30}$/.test(codigo)) errores.codigo = "3 a 30 letras, números, - o _";
  const pct = Number(d.porcentaje.replace(",", "."));
  if (!Number.isFinite(pct) || pct <= 0 || pct > 90) errores.porcentaje = "Entre 0.01 y 90";
  const minimo = dinero(d.minimoCompra);
  if (minimo === "error") errores.minimoCompra = "Monto no válido";
  const usos = d.usosMaximos.trim() ? Number(d.usosMaximos) : null;
  if (usos !== null && (!Number.isInteger(usos) || usos < 1)) errores.usosMaximos = "Número entero mayor que 0";
  if (d.validoHasta && !/^\d{4}-\d{2}-\d{2}$/.test(d.validoHasta)) errores.validoHasta = "Fecha no válida";
  if (d.clienteId && !UUID.test(d.clienteId)) errores.clienteId = "Cliente no válido";
  if (d.descripcion.length > 160) errores.descripcion = "Máximo 160 caracteres";
  if (d.id && !UUID.test(d.id)) return { error: "Código no válido" };
  if (Object.keys(errores).length) return { error: "Revisa los campos marcados.", errores };

  const { supabase } = await exigirAdmin();
  const fila = {
    codigo,
    porcentaje: Math.round(pct * 100) / 100,
    descripcion: d.descripcion.trim() || null,
    cliente_id: d.clienteId || null,
    minimo_compra: minimo as number | null,
    valido_hasta: d.validoHasta || null,
    usos_maximos: usos,
    activo: d.activo,
  };
  const { error } = d.id
    ? await supabase.from("codigos_descuento").update(fila).eq("id", d.id)
    : await supabase.from("codigos_descuento").insert(fila);
  if (error) return fallo("guardarDescuento", error.code === "23505" ? { code: "P0001", message: "Ya existe un código con ese nombre" } : error);
  revalidatePath("/admin/descuentos");
  return { ok: d.id ? "Código guardado" : "Código creado" };
}

export async function alternarDescuento(id: string, activo: boolean): Promise<Resultado> {
  if (!UUID.test(id)) return { error: "Código no válido" };
  const { supabase } = await exigirAdmin();
  const { error } = await supabase.from("codigos_descuento").update({ activo }).eq("id", id);
  if (error) return fallo("alternarDescuento", error);
  revalidatePath("/admin/descuentos");
  return { ok: activo ? "Código activado" : "Código desactivado" };
}

// ---------------------------------------------------------------------------
// Categorías
// ---------------------------------------------------------------------------

export type DatosCategoria = { id?: string; nombre: string; corto: string; tinte: string; activo: boolean };

/** Crea o edita una categoría. El número (01, 02…) lo asigna la base de datos al crearla. */
export async function guardarCategoria(d: DatosCategoria): Promise<Resultado & { id?: string }> {
  const errores: Record<string, string> = {};
  const nombre = d.nombre.trim();
  const corto = d.corto.trim() || nombre;
  if (nombre.length < 2 || nombre.length > 60) errores.nombre = "Escribe el nombre (2 a 60 letras)";
  if (corto.length > 30) errores.corto = "Máximo 30 letras";
  if (d.tinte && !esAroma(d.tinte)) errores.tinte = "Color no válido";
  if (d.id && !/^[a-z0-9-]{1,60}$/.test(d.id)) return { error: "Categoría no válida" };
  if (Object.keys(errores).length) return { error: "Revisa los campos marcados.", errores };

  const { supabase } = await exigirAdmin();
  const fila = { nombre, corto, tinte: d.tinte || null, activo: d.activo };
  if (d.id) {
    const { error } = await supabase.from("categorias").update(fila).eq("id", d.id);
    if (error) return fallo("guardarCategoria", error);
    updateTag("catalogo");
    return { ok: "Categoría guardada", id: d.id };
  }
  // id = slug del nombre; si ya existe se le agrega -2, -3…
  const base = slugify(nombre) || "categoria";
  const { data: usados } = await supabase.from("categorias").select("id").like("id", `${base}%`);
  const ids = new Set((usados ?? []).map((x) => x.id));
  let id = base;
  for (let i = 2; ids.has(id); i++) id = `${base}-${i}`;
  const { error } = await supabase.from("categorias").insert({ id, ...fila });
  if (error) return fallo("guardarCategoria", error);
  updateTag("catalogo");
  return { ok: "Categoría creada", id };
}
