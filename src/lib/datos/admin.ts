import "server-only";
import { notFound, redirect } from "next/navigation";
import type { EstadoPedido } from "@/lib/pedidos";
import { createClient } from "@/lib/supabase/server";

const n = (x: unknown) => Number(x ?? 0);

/** Exige sesión de admin. Devuelve el cliente de Supabase con esa sesión. */
export async function exigirAdmin() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/ingresar?siguiente=/admin");
  const { data: perfil } = await supabase.from("perfiles").select("id, nombre, correo, rol").eq("id", auth.user.id).single();
  if (perfil?.rol !== "admin") notFound();
  return { supabase, perfil: perfil as { id: string; nombre: string; correo: string; rol: "admin" } };
}

export type TipoCliente = "normal" | "contra_entrega" | "credito";

export const ETIQUETA_TIPO: Record<TipoCliente, string> = {
  normal: "Normal",
  contra_entrega: "Pago contra entrega",
  credito: "Crédito",
};

export const FORMA_PAGO: Record<TipoCliente, string> = {
  normal: "Transferencia",
  contra_entrega: "Contra entrega",
  credito: "Crédito",
};

// ---------------------------------------------------------------------------
// Pedidos
// ---------------------------------------------------------------------------

export type FilaPedidoAdmin = {
  id: string;
  codigo: string;
  estado: EstadoPedido;
  tipoCliente: TipoCliente;
  cliente: string;
  telefono: string;
  total: number;
  creadoEn: string;
  unidades: number;
  lineas: number;
  comprobante: boolean;
};

export async function listarPedidosAdmin(): Promise<FilaPedidoAdmin[]> {
  const { supabase } = await exigirAdmin();
  const { data, error } = await supabase
    .from("pedidos")
    .select("id, codigo, estado, tipo_cliente, contacto_nombre, contacto_telefono, total, creado_en, comprobante_path, pedido_items(cantidad)")
    .order("creado_en", { ascending: false })
    .limit(1000);
  if (error) throw new Error(error.message);
  return (data ?? []).map((p) => ({
    id: p.id,
    codigo: p.codigo,
    estado: p.estado,
    tipoCliente: p.tipo_cliente,
    cliente: p.contacto_nombre,
    telefono: p.contacto_telefono,
    total: n(p.total),
    creadoEn: p.creado_en,
    unidades: p.pedido_items.reduce((s: number, i: { cantidad: number }) => s + i.cantidad, 0),
    lineas: p.pedido_items.length,
    comprobante: !!p.comprobante_path,
  }));
}

export type DetallePedidoAdmin = {
  id: string;
  codigo: string;
  estado: EstadoPedido;
  tipoCliente: TipoCliente;
  subtotal: number;
  envio: number;
  total: number;
  zonaEnvio: string;
  cliente: { id: string; nombre: string; correo: string; telefono: string; rtn: string | null; saldo: number; limite: number };
  direccion: string;
  ciudad: string;
  comprobanteUrl: string | null;
  comprobanteEsPdf: boolean;
  metodoPagoEntrega: string | null;
  motivoCancelacion: string | null;
  fechas: Partial<Record<EstadoPedido, string | null>>;
  items: { id: string; slug: string; nombre: string; aroma: string | null; aromaNombre: string | null; tamano: string; img: string; sku: string; precio: number; cantidad: number; total: number }[];
  mensajes: { id: string; texto: string; deAdmin: boolean; creadoEn: string }[];
};

export async function obtenerPedidoAdmin(codigo: string): Promise<DetallePedidoAdmin | null> {
  if (!/^BPX-\d{1,12}$/.test(codigo)) return null;
  const { supabase } = await exigirAdmin();
  const { data: p } = await supabase
    .from("pedidos")
    .select(
      "id, codigo, estado, tipo_cliente, subtotal, envio, total, zona_envio, usuario_id, contacto_nombre, contacto_correo, contacto_telefono, departamento, ciudad, colonia, direccion, referencia, comprobante_path, metodo_pago_entrega, motivo_cancelacion, creado_en, pago_revision_en, confirmado_en, enviado_en, entregado_en, cancelado_en, pedido_items(id, producto_slug, producto_nombre, aroma_id, aroma_nombre, tamano, img, precio_unitario, cantidad, total, variantes(sku)), pedido_mensajes(id, texto, de_admin, creado_en)",
    )
    .eq("codigo", codigo)
    .maybeSingle();
  if (!p) return null;

  const [{ data: perfil }, firmado] = await Promise.all([
    supabase.from("perfiles").select("rtn, saldo, limite_credito").eq("id", p.usuario_id).single(),
    p.comprobante_path ? supabase.storage.from("comprobantes").createSignedUrl(p.comprobante_path, 600) : Promise.resolve(null),
  ]);

  type Item = Record<string, unknown> & { variantes: { sku: string } | null };
  return {
    id: p.id,
    codigo: p.codigo,
    estado: p.estado,
    tipoCliente: p.tipo_cliente,
    subtotal: n(p.subtotal),
    envio: n(p.envio),
    total: n(p.total),
    zonaEnvio: p.zona_envio,
    cliente: {
      id: p.usuario_id,
      nombre: p.contacto_nombre,
      correo: p.contacto_correo,
      telefono: p.contacto_telefono,
      rtn: perfil?.rtn ?? null,
      saldo: n(perfil?.saldo),
      limite: n(perfil?.limite_credito),
    },
    direccion: [p.direccion, p.colonia, p.referencia].filter(Boolean).join(" · "),
    ciudad: `${p.ciudad}, ${p.departamento}`,
    comprobanteUrl: firmado?.data?.signedUrl ?? null,
    comprobanteEsPdf: /\.pdf$/i.test(p.comprobante_path ?? ""),
    metodoPagoEntrega: p.metodo_pago_entrega,
    motivoCancelacion: p.motivo_cancelacion,
    fechas: {
      esperando_pago: p.creado_en,
      pago_en_revision: p.pago_revision_en,
      confirmado: p.confirmado_en,
      enviado: p.enviado_en,
      entregado: p.entregado_en,
      cancelado: p.cancelado_en,
    },
    items: (p.pedido_items as unknown as Item[]).map((i) => ({
      id: i.id as string,
      slug: i.producto_slug as string,
      nombre: i.producto_nombre as string,
      aroma: (i.aroma_id as string) ?? null,
      aromaNombre: (i.aroma_nombre as string) ?? null,
      tamano: i.tamano as string,
      img: i.img as string,
      sku: i.variantes?.sku ?? "",
      precio: n(i.precio_unitario),
      cantidad: i.cantidad as number,
      total: n(i.total),
    })),
    mensajes: (p.pedido_mensajes as { id: string; texto: string; de_admin: boolean; creado_en: string }[])
      .sort((a, b) => a.creado_en.localeCompare(b.creado_en))
      .map((m) => ({ id: m.id, texto: m.texto, deAdmin: m.de_admin, creadoEn: m.creado_en })),
  };
}

// ---------------------------------------------------------------------------
// Inventario
// ---------------------------------------------------------------------------

export type VarianteAdmin = {
  id: string;
  clave: string;
  aroma: string | null;
  etiqueta: string;
  img: string;
  sku: string;
  stock: number;
  apartado: number;
  minimo: number;
  activo: boolean;
  orden: number;
};

export type ProductoAdmin = {
  id: string;
  slug: string;
  linea: string;
  nombre: string;
  nombreBase: string;
  tamano: string;
  categoria: string;
  precio: number | null;
  costo: number | null;
  descripcion: string;
  beneficios: string[];
  modoUso: string[];
  seguridad: boolean;
  cotizar: boolean;
  insignias: string[];
  tinte: string | null;
  activo: boolean;
  orden: number;
  variantes: VarianteAdmin[];
};

export async function listarInventario(): Promise<ProductoAdmin[]> {
  const { supabase } = await exigirAdmin();
  const [{ data: prods, error }, { data: inv, error: e2 }] = await Promise.all([
    supabase
      .from("productos")
      .select("id, slug, linea, nombre, nombre_base, tamano, categoria_id, precio, costo, descripcion, beneficios, modo_uso, seguridad, cotizar, insignias, tinte, activo, orden")
      .order("orden"),
    supabase.rpc("admin_inventario"),
  ]);
  if (error || e2) throw new Error((error ?? e2)!.message);
  const porProducto = new Map<string, VarianteAdmin[]>();
  for (const v of (inv ?? []) as Record<string, unknown>[]) {
    const lista = porProducto.get(v.producto_id as string) ?? [];
    lista.push({
      id: v.id as string,
      clave: v.clave as string,
      aroma: (v.aroma_id as string) ?? null,
      etiqueta: v.etiqueta as string,
      img: v.img as string,
      sku: v.sku as string,
      stock: v.stock as number,
      apartado: v.stock_apartado as number,
      minimo: v.stock_minimo as number,
      activo: v.activo as boolean,
      orden: v.orden as number,
    });
    porProducto.set(v.producto_id as string, lista);
  }
  return (prods ?? []).map((p) => ({
    id: p.id,
    slug: p.slug,
    linea: p.linea,
    nombre: p.nombre,
    nombreBase: p.nombre_base,
    tamano: p.tamano,
    categoria: p.categoria_id,
    precio: p.precio == null ? null : n(p.precio),
    costo: p.costo == null ? null : n(p.costo),
    descripcion: p.descripcion,
    beneficios: p.beneficios,
    modoUso: p.modo_uso,
    seguridad: p.seguridad,
    cotizar: p.cotizar,
    insignias: p.insignias,
    tinte: p.tinte,
    activo: p.activo,
    orden: p.orden,
    variantes: (porProducto.get(p.id) ?? []).sort((a, b) => a.orden - b.orden),
  }));
}

export type Movimiento = {
  id: string;
  varianteId: string;
  tipo: "entrada" | "venta" | "apartado" | "liberacion" | "devolucion" | "ajuste";
  cantidad: number;
  stock: number;
  apartado: number;
  documento: string | null;
  nota: string | null;
  creadoEn: string;
};

export async function kardex(varianteIds: string[]): Promise<Movimiento[]> {
  if (!varianteIds.length) return [];
  const { supabase } = await exigirAdmin();
  const { data, error } = await supabase
    .from("movimientos_inventario")
    .select("id, variante_id, tipo, cantidad, stock_resultante, apartado_resultante, documento, nota, creado_en")
    .in("variante_id", varianteIds)
    .order("creado_en", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []).map((m) => ({
    id: m.id,
    varianteId: m.variante_id,
    tipo: m.tipo,
    cantidad: m.cantidad,
    stock: m.stock_resultante,
    apartado: m.apartado_resultante,
    documento: m.documento,
    nota: m.nota,
    creadoEn: m.creado_en,
  }));
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export async function datosDashboard() {
  const { supabase } = await exigirAdmin();
  const desde = new Date(Date.now() - 30 * 864e5).toISOString();
  const [{ data: pedidos }, { data: items }, inventario, { data: credito }] = await Promise.all([
    supabase.from("pedidos").select("id, codigo, estado, contacto_nombre, total, creado_en, confirmado_en").gte("creado_en", desde).order("creado_en", { ascending: false }),
    supabase
      .from("pedido_items")
      .select("producto_nombre, aroma_id, aroma_nombre, tamano, img, cantidad, total, pedidos!inner(estado, creado_en)")
      .gte("pedidos.creado_en", desde)
      .in("pedidos.estado", ["confirmado", "enviado", "entregado"]),
    listarInventario(),
    supabase.from("perfiles").select("saldo").gt("saldo", 0),
  ]);
  return {
    ahora: Date.now(),
    pedidos: (pedidos ?? []).map((p) => ({
      id: p.id,
      codigo: p.codigo,
      estado: p.estado as EstadoPedido,
      cliente: p.contacto_nombre,
      total: n(p.total),
      creadoEn: p.creado_en,
      confirmadoEn: p.confirmado_en,
    })),
    items: (items ?? []).map((i) => ({
      nombre: i.producto_nombre,
      aroma: i.aroma_id,
      aromaNombre: i.aroma_nombre,
      tamano: i.tamano,
      img: i.img,
      cantidad: i.cantidad,
      total: n(i.total),
    })),
    inventario,
    cuentasPorCobrar: (credito ?? []).reduce((s, c) => s + n(c.saldo), 0),
  };
}
