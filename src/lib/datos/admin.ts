import "server-only";
import { lugar } from "@/lib/formato";
import { notFound, redirect } from "next/navigation";
import type { EstadoPedido } from "@/lib/pedidos";
import { createClient } from "@/lib/supabase/server";
import type { Categoria } from "@/lib/catalogo";
import { aCategoria } from "./catalogo";
import { todasLasFilas } from "./paginar";

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
  descuento: number;
  codigoDescuento: string | null;
  descuentoPorcentaje: number | null;
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
      "id, codigo, estado, tipo_cliente, subtotal, descuento, codigo_descuento, descuento_porcentaje, envio, total, zona_envio, usuario_id, contacto_nombre, contacto_correo, contacto_telefono, departamento, municipio, ciudad, colonia, direccion, referencia, comprobante_path, metodo_pago_entrega, motivo_cancelacion, creado_en, pago_revision_en, confirmado_en, enviado_en, entregado_en, cancelado_en, pedido_items(id, producto_slug, producto_nombre, aroma_id, aroma_nombre, tamano, img, precio_unitario, cantidad, total, variantes(sku)), pedido_mensajes(id, texto, de_admin, creado_en)",
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
    descuento: n(p.descuento),
    codigoDescuento: p.codigo_descuento,
    descuentoPorcentaje: p.descuento_porcentaje == null ? null : n(p.descuento_porcentaje),
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
    ciudad: lugar(p.ciudad, p.municipio, p.departamento),
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
  codigo: string;
  categoriaNombre: string;
  categoriaCorto: string;
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
      .select("id, slug, codigo, linea, nombre, nombre_base, tamano, categoria_id, categorias(nombre, corto), precio, costo, descripcion, beneficios, modo_uso, seguridad, cotizar, insignias, tinte, activo, orden")
      .order("codigo"),
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
    codigo: p.codigo,
    categoriaNombre: (p.categorias as unknown as { nombre: string } | null)?.nombre ?? p.categoria_id,
    categoriaCorto: (p.categorias as unknown as { corto: string } | null)?.corto ?? p.categoria_id,
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
  // Todo por páginas: con más de 1000 filas Supabase cortaría y los totales saldrían mal.
  const [pedidos, items, inventario, credito] = await Promise.all([
    todasLasFilas((a, b) =>
      supabase.from("pedidos").select("id, codigo, estado, contacto_nombre, total, creado_en, confirmado_en").gte("creado_en", desde).order("creado_en", { ascending: false }).order("id").range(a, b),
    ),
    todasLasFilas((a, b) =>
      supabase
        .from("pedido_items")
        .select("id, producto_nombre, aroma_id, aroma_nombre, tamano, img, cantidad, total, pedidos!inner(estado, creado_en)")
        .gte("pedidos.creado_en", desde)
        .in("pedidos.estado", ["confirmado", "enviado", "entregado"])
        .order("id")
        .range(a, b),
    ),
    listarInventario(),
    todasLasFilas((a, b) => supabase.from("perfiles").select("id, saldo").gt("saldo", 0).order("id").range(a, b)),
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

// ---------------------------------------------------------------------------
// Clientes y cuentas por cobrar
// ---------------------------------------------------------------------------

export type FilaCliente = {
  id: string;
  nombre: string;
  correo: string;
  telefono: string | null;
  rtn: string | null;
  tipo: TipoCliente;
  limite: number;
  saldo: number;
  ciudad: string | null;
  pedidos: number;
  comprado: number;
  ultimaCompra: string | null;
  creadoEn: string;
};

type PedidoCorto = { usuario_id: string; codigo: string; estado: EstadoPedido; tipo_cliente: TipoCliente; total: number | string; creado_en: string; ciudad: string; departamento: string };

async function pedidosDeClientes(ids?: string[]) {
  const { supabase } = await exigirAdmin();
  const filas = await todasLasFilas((a, b) => {
    let q = supabase.from("pedidos").select("usuario_id, codigo, estado, tipo_cliente, total, creado_en, ciudad, departamento").order("creado_en", { ascending: false }).order("id");
    if (ids) q = q.in("usuario_id", ids);
    return q.range(a, b);
  });
  return filas as PedidoCorto[];
}

export async function listarClientes(): Promise<FilaCliente[]> {
  const { supabase } = await exigirAdmin();
  const [perfiles, pedidos] = await Promise.all([
    todasLasFilas((a, b) => supabase.from("perfiles").select("id, nombre, correo, telefono, rtn, tipo_cliente, limite_credito, saldo, creado_en").eq("rol", "cliente").order("creado_en", { ascending: false }).order("id").range(a, b)),
    pedidosDeClientes(),
  ]);
  return perfiles.map((c) => {
    const suyos = pedidos.filter((p) => p.usuario_id === c.id);
    const validos = suyos.filter((p) => p.estado !== "cancelado");
    return {
      id: c.id,
      nombre: c.nombre || c.correo,
      correo: c.correo,
      telefono: c.telefono,
      rtn: c.rtn,
      tipo: c.tipo_cliente,
      limite: n(c.limite_credito),
      saldo: n(c.saldo),
      ciudad: suyos[0] ? `${suyos[0].ciudad}` : null,
      pedidos: validos.length,
      comprado: validos.reduce((s, p) => s + n(p.total), 0),
      ultimaCompra: suyos[0]?.creado_en ?? null,
      creadoEn: c.creado_en,
    };
  });
}

export type Abono = { id: string; monto: number; metodo: string; referencia: string | null; creadoEn: string };

export async function obtenerCliente(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { supabase } = await exigirAdmin();
  const [{ data: c }, pedidos, { data: abonos }, { data: dirs }] = await Promise.all([
    supabase.from("perfiles").select("id, nombre, correo, telefono, rtn, rol, tipo_cliente, limite_credito, saldo, creado_en").eq("id", id).maybeSingle(),
    pedidosDeClientes([id]),
    supabase.from("abonos").select("id, monto, metodo, referencia, creado_en").eq("cliente_id", id).order("creado_en", { ascending: false }),
    supabase.from("direcciones").select("direccion, colonia, ciudad, departamento").eq("usuario_id", id).order("predeterminada", { ascending: false }).limit(1),
  ]);
  if (!c) return null;
  const dir = dirs?.[0];
  return {
    ahora: Date.now(),
    id: c.id,
    nombre: c.nombre || c.correo,
    correo: c.correo,
    telefono: c.telefono as string | null,
    rtn: c.rtn as string | null,
    esAdmin: c.rol === "admin",
    tipo: c.tipo_cliente as TipoCliente,
    limite: n(c.limite_credito),
    saldo: n(c.saldo),
    creadoEn: c.creado_en as string,
    direccion: dir ? `${dir.direccion}, ${dir.colonia}` : null,
    ciudad: dir ? `${dir.ciudad}, ${dir.departamento}` : pedidos[0] ? `${pedidos[0].ciudad}, ${pedidos[0].departamento}` : null,
    pedidos: pedidos.map((p) => ({ codigo: p.codigo, estado: p.estado, tipoCliente: p.tipo_cliente, total: n(p.total), creadoEn: p.creado_en })),
    abonos: (abonos ?? []).map((a) => ({ id: a.id, monto: n(a.monto), metodo: a.metodo, referencia: a.referencia, creadoEn: a.creado_en })) as Abono[],
  };
}

export async function datosCuentasPorCobrar() {
  const { supabase } = await exigirAdmin();
  const { data: perfiles, error } = await supabase
    .from("perfiles")
    .select("id, nombre, correo, limite_credito, saldo")
    .gt("saldo", 0)
    .order("saldo", { ascending: false });
  if (error) throw new Error(error.message);
  const ids = (perfiles ?? []).map((p) => p.id);
  if (!ids.length) return { ahora: Date.now(), clientes: [] };
  const [pedidos, { data: abonos }] = await Promise.all([
    pedidosDeClientes(ids),
    supabase.from("abonos").select("cliente_id, creado_en").in("cliente_id", ids).order("creado_en", { ascending: false }),
  ]);
  return {
    ahora: Date.now(),
    clientes: (perfiles ?? []).map((c) => ({
      id: c.id,
      nombre: c.nombre || c.correo,
      limite: n(c.limite_credito),
      saldo: n(c.saldo),
      documentos: pedidos
        .filter((p) => p.usuario_id === c.id && p.tipo_cliente === "credito" && p.estado !== "cancelado")
        .map((p) => ({ codigo: p.codigo, fecha: p.creado_en, total: n(p.total) })),
      ultimoAbono: abonos?.find((a) => a.cliente_id === c.id)?.creado_en ?? null,
    })),
  };
}

// ---------------------------------------------------------------------------
// Códigos de descuento
// ---------------------------------------------------------------------------

export type CodigoDescuento = {
  id: string;
  codigo: string;
  porcentaje: number;
  descripcion: string | null;
  clienteId: string | null;
  clienteNombre: string | null;
  minimoCompra: number | null;
  validoHasta: string | null;
  usosMaximos: number | null;
  usos: number;
  activo: boolean;
  creadoEn: string;
};

export async function listarDescuentos(): Promise<CodigoDescuento[]> {
  const { supabase } = await exigirAdmin();
  const { data, error } = await supabase
    .from("codigos_descuento")
    .select("id, codigo, porcentaje, descripcion, cliente_id, minimo_compra, valido_hasta, usos_maximos, usos, activo, creado_en, perfiles(nombre, correo)")
    .order("creado_en", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((d) => {
    const cli = d.perfiles as unknown as { nombre: string; correo: string } | null;
    return {
      id: d.id,
      codigo: d.codigo,
      porcentaje: n(d.porcentaje),
      descripcion: d.descripcion,
      clienteId: d.cliente_id,
      clienteNombre: cli ? cli.nombre || cli.correo : null,
      minimoCompra: d.minimo_compra == null ? null : n(d.minimo_compra),
      validoHasta: d.valido_hasta,
      usosMaximos: d.usos_maximos,
      usos: d.usos,
      activo: d.activo,
      creadoEn: d.creado_en,
    };
  });
}

// ---------------------------------------------------------------------------
// Categorías (0008)
// ---------------------------------------------------------------------------

export type CategoriaAdmin = Categoria & { productos: number };

/** Todas las categorías (también las ocultas), por número, con cuántos productos tiene cada una. */
export async function listarCategoriasAdmin(): Promise<CategoriaAdmin[]> {
  const { supabase } = await exigirAdmin();
  const { data, error } = await supabase.from("categorias").select("id, numero, nombre, corto, img, tinte, oscura, activo, productos(count)").order("numero");
  if (error) throw new Error(error.message);
  return data.map((c) => ({ ...aCategoria(c), productos: (c.productos as unknown as { count: number }[])[0]?.count ?? 0 }));
}
