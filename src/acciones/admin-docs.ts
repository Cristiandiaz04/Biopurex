"use server";

import { revalidatePath, updateTag } from "next/cache";
import { exigirAdmin } from "@/lib/datos/admin";
import type { Resultado } from "./admin";

const UUID = /^[0-9a-f-]{36}$/i;
const soloDigitos = (s: string) => s.replace(/\D/g, "");

function fallo(contexto: string, error: { code?: string; message: string }): Resultado {
  console.error(`[${contexto}]`, error.code, error.message);
  return { error: error.code === "P0001" ? error.message : "No se pudo completar la acción. Intenta de nuevo." };
}

function dinero(s: string): number | null | "error" {
  const t = s.trim().replace(/,/g, "");
  if (!t) return null;
  const v = Number(t);
  return Number.isFinite(v) && v >= 0 && v < 1e9 ? Math.round(v * 100) / 100 : "error";
}

// ---------------------------------------------------------------------------
// Proveedores
// ---------------------------------------------------------------------------

export type DatosProveedor = {
  id?: string;
  nombre: string;
  rtn: string;
  contacto: string;
  telefono: string;
  correo: string;
  direccion: string;
  ciudad: string;
  condiciones: string;
};

export async function guardarProveedor(d: DatosProveedor): Promise<Resultado & { id?: string }> {
  const e: Record<string, string> = {};
  const nombre = d.nombre.trim();
  const rtn = soloDigitos(d.rtn);
  const tel = soloDigitos(d.telefono);
  if (nombre.length < 2 || nombre.length > 120) e.nombre = "Escribe el nombre del proveedor";
  if (rtn && rtn.length !== 14) e.rtn = "El RTN tiene 14 dígitos";
  if (tel && tel.length !== 8) e.telefono = "8 dígitos";
  if (d.correo.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.correo.trim())) e.correo = "Correo no válido";
  if (d.id && !UUID.test(d.id)) return { error: "Proveedor no válido" };
  if (Object.keys(e).length) return { error: "Revisa los campos marcados.", errores: e };
  const { supabase } = await exigirAdmin();
  const fila = {
    nombre,
    rtn: rtn || null,
    contacto: d.contacto.trim().slice(0, 120) || null,
    telefono: tel || null,
    correo: d.correo.trim().slice(0, 120) || null,
    direccion: d.direccion.trim().slice(0, 200) || null,
    ciudad: d.ciudad.trim().slice(0, 80) || null,
    condiciones: d.condiciones.trim().slice(0, 60) || "Contado",
  };
  const { data, error } = d.id
    ? await supabase.from("proveedores").update(fila).eq("id", d.id).select("id").single()
    : await supabase.from("proveedores").insert(fila).select("id").single();
  if (error) return fallo("guardarProveedor", error);
  revalidatePath("/admin/proveedores");
  return { ok: "Proveedor guardado", id: data.id };
}

// ---------------------------------------------------------------------------
// Compras
// ---------------------------------------------------------------------------

export type LineaCompra = { varianteId: string; cantidad: string; costo: string };

export async function guardarCompra(d: {
  id?: string;
  proveedorId: string;
  facturaProveedor: string;
  fecha: string;
  notas: string;
  lineas: LineaCompra[];
  recibir: boolean;
}): Promise<Resultado & { id?: string }> {
  if (!UUID.test(d.proveedorId)) return { error: "Elige un proveedor" };
  if (d.id && !UUID.test(d.id)) return { error: "Compra no válida" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.fecha)) return { error: "Fecha no válida" };
  const lineas = d.lineas.filter((l) => l.varianteId);
  if (!lineas.length) return { error: "Agrega al menos una línea" };
  if (lineas.length > 200) return { error: "Demasiadas líneas" };
  const filas = [];
  for (const [i, l] of lineas.entries()) {
    // "m:<id>" = materia prima (admite decimales) · "v:<id>" o <id> = producto de reventa (enteros).
    const esMateria = l.varianteId.startsWith("m:");
    const id = l.varianteId.replace(/^[mv]:/, "");
    const cant = Number(l.cantidad.replace(/,/g, ""));
    const costo = dinero(l.costo);
    if (!UUID.test(id)) return { error: `Línea ${i + 1}: elige qué compraste` };
    if (!Number.isFinite(cant) || cant <= 0 || cant > 1000000 || (!esMateria && !Number.isInteger(cant))) {
      return { error: `Línea ${i + 1}: ${esMateria ? "cantidad mayor que cero" : "los productos se compran en unidades enteras"}` };
    }
    if (costo === "error" || costo === null) return { error: `Línea ${i + 1}: escribe el costo unitario` };
    filas.push(esMateria ? { materia_id: id, cantidad: cant, costo_unitario: costo } : { variante_id: id, cantidad: cant, costo_unitario: costo });
  }

  const { supabase } = await exigirAdmin();
  const cabecera = {
    proveedor_id: d.proveedorId,
    factura_proveedor: d.facturaProveedor.trim().slice(0, 40) || null,
    fecha: d.fecha,
    notas: d.notas.trim().slice(0, 300) || null,
  };
  let id = d.id;
  if (id) {
    const { error } = await supabase.from("compras").update(cabecera).eq("id", id);
    if (error) return fallo("guardarCompra", error);
    const { error: e2 } = await supabase.from("compra_items").delete().eq("compra_id", id);
    if (e2) return fallo("guardarCompra", e2);
  } else {
    const { data, error } = await supabase.from("compras").insert(cabecera).select("id").single();
    if (error) return fallo("guardarCompra", error);
    id = data.id as string;
  }
  const { error: e3 } = await supabase.from("compra_items").insert(filas.map((f) => ({ ...f, compra_id: id })));
  if (e3) return fallo("guardarCompra", e3);

  if (d.recibir) {
    const { error: e4 } = await supabase.rpc("admin_recibir_compra", { p_compra: id });
    if (e4) return { ...fallo("recibirCompra", e4), id };
    updateTag("catalogo");
    revalidatePath("/admin/productos");
  }
  revalidatePath("/admin/compras");
  return { ok: d.recibir ? "Compra recibida: el inventario ya se actualizó" : "Borrador guardado", id };
}

// ---------------------------------------------------------------------------
// Cotizaciones
// ---------------------------------------------------------------------------

export async function guardarCotizacion(d: {
  clienteId: string;
  vigenciaDias: number;
  notas: string;
  lineas: { varianteId: string; cantidad: string }[];
}): Promise<Resultado & { id?: string }> {
  if (!UUID.test(d.clienteId)) return { error: "Elige un cliente" };
  if (![7, 15, 30].includes(d.vigenciaDias)) return { error: "Vigencia no válida" };
  const lineas = d.lineas.filter((l) => l.varianteId);
  if (!lineas.length) return { error: "Agrega al menos un producto" };
  if (lineas.length > 50) return { error: "Demasiados productos" };
  for (const [i, l] of lineas.entries()) {
    const c = Number(l.cantidad);
    if (!UUID.test(l.varianteId) || !Number.isInteger(c) || c < 1 || c > 99) return { error: `Línea ${i + 1}: cantidad entre 1 y 99` };
  }

  const { supabase } = await exigirAdmin();
  // Precio y descripción salen de la BD (nunca del navegador).
  const { data: vars, error } = await supabase
    .from("variantes")
    .select("id, etiqueta, aroma_id, sku, productos(nombre, precio, cotizar)")
    .in("id", lineas.map((l) => l.varianteId));
  if (error) return fallo("guardarCotizacion", error);
  const porId = new Map((vars ?? []).map((v) => [v.id, v]));
  const items = [];
  for (const l of lineas) {
    const v = porId.get(l.varianteId);
    const p = v?.productos as unknown as { nombre: string; precio: number | string | null; cotizar: boolean } | undefined;
    if (!v || !p || p.precio == null) return { error: `${p?.nombre ?? "Un producto"} no tiene precio: ponle uno en Productos` };
    items.push({
      variante_id: v.id,
      descripcion: v.aroma_id ? `${p.nombre} · ${v.etiqueta}` : p.nombre,
      sku: v.sku,
      cantidad: Number(l.cantidad),
      precio_unitario: Number(p.precio),
    });
  }
  const total = items.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0);
  const hasta = new Date(Date.now() + d.vigenciaDias * 864e5).toLocaleDateString("en-CA", { timeZone: "America/Tegucigalpa" });
  const { data: q, error: e2 } = await supabase
    .from("cotizaciones")
    .insert({ cliente_id: d.clienteId, vigencia_dias: d.vigenciaDias, valida_hasta: hasta, notas: d.notas.trim().slice(0, 500) || null, total })
    .select("id")
    .single();
  if (e2) return fallo("guardarCotizacion", e2);
  const { error: e3 } = await supabase.from("cotizacion_items").insert(items.map((i) => ({ ...i, cotizacion_id: q.id })));
  if (e3) return fallo("guardarCotizacion", e3);
  revalidatePath("/admin/cotizaciones");
  return { ok: "Cotización creada", id: q.id };
}

export async function convertirCotizacion(id: string): Promise<Resultado & { codigo?: string }> {
  if (!UUID.test(id)) return { error: "Cotización no válida" };
  const { supabase } = await exigirAdmin();
  const { data, error } = await supabase.rpc("admin_convertir_cotizacion", { p_cotizacion: id });
  if (error) return fallo("convertirCotizacion", error);
  updateTag("catalogo");
  revalidatePath(`/admin/cotizaciones/${id}`);
  revalidatePath("/admin/cotizaciones");
  revalidatePath("/admin/pedidos");
  return { ok: "Pedido creado", codigo: data as string };
}

export async function renovarCotizacion(id: string, dias: number): Promise<Resultado> {
  if (!UUID.test(id) || ![7, 15, 30].includes(dias)) return { error: "Datos no válidos" };
  const { supabase } = await exigirAdmin();
  const hasta = new Date(Date.now() + dias * 864e5).toLocaleDateString("en-CA", { timeZone: "America/Tegucigalpa" });
  const { error } = await supabase.from("cotizaciones").update({ valida_hasta: hasta, vigencia_dias: dias }).eq("id", id).eq("estado", "emitida");
  if (error) return fallo("renovarCotizacion", error);
  revalidatePath(`/admin/cotizaciones/${id}`);
  return { ok: "Vigencia renovada" };
}

// ---------------------------------------------------------------------------
// Facturas
// ---------------------------------------------------------------------------

export async function emitirFactura(pedidoId: string, codigoPedido: string): Promise<Resultado & { id?: string }> {
  if (!UUID.test(pedidoId)) return { error: "Pedido no válido" };
  const { supabase } = await exigirAdmin();
  const { data, error } = await supabase.rpc("admin_emitir_factura", { p_pedido: pedidoId });
  if (error) return fallo("emitirFactura", error);
  const { data: f } = await supabase.from("facturas").select("id").eq("codigo", data as string).single();
  revalidatePath(`/admin/pedidos/${codigoPedido}`);
  revalidatePath("/admin/facturas");
  return { ok: `Factura ${data} emitida`, id: f?.id };
}

export async function anularFactura(id: string, motivo: string): Promise<Resultado> {
  if (!UUID.test(id)) return { error: "Factura no válida" };
  const { supabase } = await exigirAdmin();
  const { error } = await supabase.rpc("admin_anular_factura", { p_factura: id, p_motivo: motivo.trim().slice(0, 200) });
  if (error) return fallo("anularFactura", error);
  revalidatePath(`/admin/facturas/${id}`);
  revalidatePath("/admin/facturas");
  return { ok: "Factura anulada" };
}

// ---------------------------------------------------------------------------
// Configuración
// ---------------------------------------------------------------------------

export type DatosConfiguracion = {
  razonSocial: string;
  rtnEmisor: string;
  direccionEmisor: string;
  telefonoEmisor: string;
  correoEmisor: string;
  banco: string;
  tipoCuenta: string;
  numeroCuenta: string;
  titular: string;
};

export async function guardarConfiguracion(d: DatosConfiguracion): Promise<Resultado> {
  const e: Record<string, string> = {};
  const req = (k: keyof DatosConfiguracion, max: number) => {
    const v = d[k].trim();
    if (!v || v.length > max) e[k] = "Este campo es obligatorio";
    return v;
  };
  const razon = req("razonSocial", 120);
  const rtn = soloDigitos(d.rtnEmisor);
  if (rtn && rtn.length !== 14) e.rtnEmisor = "El RTN tiene 14 dígitos";
  const direccion = req("direccionEmisor", 200);
  const telefono = req("telefonoEmisor", 20);
  const correo = req("correoEmisor", 120);
  if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) e.correoEmisor = "Correo no válido";
  const banco = req("banco", 60);
  const tipo = req("tipoCuenta", 60);
  const numero = req("numeroCuenta", 40);
  const titular = req("titular", 120);
  if (Object.keys(e).length) return { error: "Revisa los campos marcados.", errores: e };

  const { supabase } = await exigirAdmin();
  const { error } = await supabase
    .from("configuracion")
    .update({
      razon_social: razon,
      rtn_emisor: rtn || null,
      direccion_emisor: direccion,
      telefono_emisor: telefono,
      correo_emisor: correo,
      banco,
      tipo_cuenta: tipo,
      numero_cuenta: numero,
      titular,
    })
    .eq("id", true);
  if (error) return fallo("guardarConfiguracion", error);
  // La tienda muestra los datos bancarios desde una caché de horas: se invalida ya.
  updateTag("configuracion");
  revalidatePath("/admin/configuracion");
  return { ok: "Configuración guardada" };
}
