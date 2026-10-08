import "server-only";
import type { EstadoPedido } from "@/lib/pedidos";
import { exigirAdmin, listarInventario, type TipoCliente } from "./admin";
import { listarMaterias } from "./produccion";
import type { ZonasEnvio } from "@/lib/envio";

const n = (x: unknown) => Number(x ?? 0);
const ISV = 0.15;

// ---------------------------------------------------------------------------
// Variantes para los selectores de líneas (compras y cotizaciones)
// ---------------------------------------------------------------------------

export type OpcionVariante = {
  id: string;
  producto: string;
  etiqueta: string;
  aroma: string | null;
  img: string;
  sku: string;
  precio: number | null;
  costo: number | null;
  stock: number;
  disponible: number;
  /** Solo materia prima: unidad de medida (kg, lb…). */
  unidad?: string;
};

export async function opcionesVariantes(): Promise<OpcionVariante[]> {
  const productos = await listarInventario();
  return productos.flatMap((p) =>
    p.variantes.map((v) => ({
      id: v.id,
      producto: p.nombre,
      etiqueta: v.etiqueta,
      aroma: v.aroma,
      img: v.img,
      sku: v.sku,
      precio: p.cotizar ? null : p.precio,
      costo: p.costo,
      stock: v.stock,
      disponible: v.stock - v.apartado,
    })),
  );
}

/**
 * Opciones para las líneas de compra: materia prima ("m:<id>") y productos de reventa ("v:<id>").
 */
export async function opcionesCompra(): Promise<OpcionVariante[]> {
  const [materias, variantes] = await Promise.all([listarMaterias(), opcionesVariantes()]);
  return [
    ...materias
      .filter((m) => m.activo)
      .map((m) => ({
        id: `m:${m.id}`,
        producto: "Materia prima",
        etiqueta: m.nombre,
        aroma: null,
        img: "",
        sku: m.codigo,
        precio: null,
        costo: m.costo,
        stock: m.stock,
        disponible: m.stock,
        unidad: m.unidad,
      })),
    ...variantes.map((v) => ({ ...v, id: `v:${v.id}`, producto: `Reventa · ${v.producto}` })),
  ];
}

// ---------------------------------------------------------------------------
// Proveedores y compras
// ---------------------------------------------------------------------------

export type Proveedor = {
  id: string;
  nombre: string;
  rtn: string | null;
  contacto: string | null;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
  ciudad: string | null;
  condiciones: string;
  activo: boolean;
};

export type FilaCompra = {
  id: string;
  codigo: string;
  proveedorId: string;
  proveedor: string;
  facturaProveedor: string | null;
  fecha: string;
  estado: "borrador" | "recibida";
  unidades: number;
  subtotal: number;
  isv: number;
  total: number;
};

const SELECT_PROVEEDOR = "id, nombre, rtn, contacto, telefono, correo, direccion, ciudad, condiciones, activo";

function aCompra(c: Record<string, unknown>): FilaCompra {
  const items = ((c.compra_items as { cantidad: number | string; total: number | string }[]) ?? []).map((i) => ({ cantidad: n(i.cantidad), total: i.total }));
  const subtotal = items.reduce((s, i) => s + n(i.total), 0);
  const prov = c.proveedores as { nombre: string } | null;
  return {
    id: c.id as string,
    codigo: c.codigo as string,
    proveedorId: c.proveedor_id as string,
    proveedor: prov?.nombre ?? "—",
    facturaProveedor: (c.factura_proveedor as string) ?? null,
    fecha: c.fecha as string,
    estado: c.estado as FilaCompra["estado"],
    unidades: items.reduce((s, i) => s + i.cantidad, 0),
    subtotal,
    isv: Math.round(subtotal * ISV * 100) / 100,
    total: Math.round(subtotal * (1 + ISV) * 100) / 100,
  };
}

export async function listarProveedores() {
  const { supabase } = await exigirAdmin();
  const [{ data: provs, error }, compras] = await Promise.all([
    supabase.from("proveedores").select(SELECT_PROVEEDOR).order("nombre"),
    listarCompras(),
  ]);
  if (error) throw new Error(error.message);
  return (provs ?? []).map((p) => {
    const suyas = compras.filter((c) => c.proveedorId === p.id && c.estado === "recibida");
    return { ...(p as Proveedor), compras: suyas.length, totalComprado: suyas.reduce((s, c) => s + c.total, 0) };
  });
}

export async function listarCompras(): Promise<FilaCompra[]> {
  const { supabase } = await exigirAdmin();
  const { data, error } = await supabase
    .from("compras")
    .select("id, codigo, proveedor_id, factura_proveedor, fecha, estado, proveedores(nombre), compra_items(cantidad, total)")
    .order("numero", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((c) => aCompra(c as unknown as Record<string, unknown>));
}

export async function obtenerCompra(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { supabase } = await exigirAdmin();
  const { data: c } = await supabase
    .from("compras")
    .select(
      "id, codigo, proveedor_id, factura_proveedor, fecha, estado, notas, recibida_en, proveedores(nombre), compra_items(id, variante_id, materia_id, cantidad, costo_unitario, total)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!c) return null;
  const fila = aCompra(c as unknown as Record<string, unknown>);
  return {
    ...fila,
    notas: c.notas as string | null,
    recibidaEn: c.recibida_en as string | null,
    lineas: (c.compra_items as { id: string; variante_id: string | null; materia_id: string | null; cantidad: number | string; costo_unitario: number | string; total: number | string }[]).map((i) => ({
      id: i.id,
      // "m:<id>" materia prima · "v:<id>" producto de reventa
      varianteId: i.materia_id ? `m:${i.materia_id}` : `v:${i.variante_id}`,
      cantidad: n(i.cantidad),
      costo: n(i.costo_unitario),
      total: n(i.total),
    })),
  };
}

export async function obtenerProveedor(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { supabase } = await exigirAdmin();
  const [{ data: p }, { data: compras }] = await Promise.all([
    supabase.from("proveedores").select(SELECT_PROVEEDOR).eq("id", id).maybeSingle(),
    supabase
      .from("compras")
      .select("id, codigo, proveedor_id, factura_proveedor, fecha, estado, proveedores(nombre), compra_items(cantidad, total, variante_id, materia_id)")
      .eq("proveedor_id", id)
      .order("numero", { ascending: false }),
  ]);
  if (!p) return null;
  const filas = (compras ?? []).map((c) => aCompra(c as unknown as Record<string, unknown>));
  const variantes = new Map<string, number>();
  for (const c of compras ?? []) {
    if (c.estado !== "recibida") continue;
    for (const i of c.compra_items as { variante_id: string | null; materia_id: string | null; cantidad: number | string }[]) {
      const clave = i.materia_id ? `m:${i.materia_id}` : `v:${i.variante_id}`;
      variantes.set(clave, (variantes.get(clave) ?? 0) + n(i.cantidad));
    }
  }
  return { proveedor: p as Proveedor, compras: filas, variantes };
}

// ---------------------------------------------------------------------------
// Cotizaciones
// ---------------------------------------------------------------------------

export type FilaCotizacion = {
  id: string;
  codigo: string;
  clienteId: string;
  cliente: string;
  creadoEn: string;
  validaHasta: string;
  estado: "emitida" | "convertida" | "vencida";
  total: number;
  pedidoCodigo: string | null;
};

const hoyHN = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Tegucigalpa" });

function aCotizacion(q: Record<string, unknown>, hoy: string): FilaCotizacion {
  const cli = q.perfiles as { nombre: string; correo: string } | null;
  const ped = q.pedidos as { codigo: string } | null;
  const estado = q.estado === "convertida" ? "convertida" : (q.valida_hasta as string) < hoy ? "vencida" : "emitida";
  return {
    id: q.id as string,
    codigo: q.codigo as string,
    clienteId: q.cliente_id as string,
    cliente: cli ? cli.nombre || cli.correo : "—",
    creadoEn: q.creado_en as string,
    validaHasta: q.valida_hasta as string,
    estado,
    total: n(q.total),
    pedidoCodigo: ped?.codigo ?? null,
  };
}

export async function listarCotizaciones(): Promise<FilaCotizacion[]> {
  const { supabase } = await exigirAdmin();
  const { data, error } = await supabase
    .from("cotizaciones")
    .select("id, codigo, cliente_id, creado_en, valida_hasta, estado, total, perfiles(nombre, correo), pedidos(codigo)")
    .order("numero", { ascending: false });
  if (error) throw new Error(error.message);
  const hoy = hoyHN();
  return (data ?? []).map((q) => aCotizacion(q as unknown as Record<string, unknown>, hoy));
}

export async function obtenerCotizacion(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { supabase } = await exigirAdmin();
  const { data: q } = await supabase
    .from("cotizaciones")
    .select(
      "id, codigo, cliente_id, creado_en, valida_hasta, vigencia_dias, notas, estado, total, perfiles(nombre, correo, telefono, rtn, tipo_cliente), pedidos(codigo), cotizacion_items(id, variante_id, descripcion, sku, cantidad, precio_unitario, total)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!q) return null;
  const { data: dir } = await supabase
    .from("direcciones")
    .select("direccion, colonia, ciudad, departamento")
    .eq("usuario_id", q.cliente_id)
    .order("predeterminada", { ascending: false })
    .limit(1)
    .maybeSingle();
  const perfil = q.perfiles as unknown as { nombre: string; correo: string; telefono: string | null; rtn: string | null; tipo_cliente: TipoCliente };
  return {
    ...aCotizacion(q as unknown as Record<string, unknown>, hoyHN()),
    vigenciaDias: q.vigencia_dias as number,
    notas: q.notas as string | null,
    cliente: {
      nombre: perfil.nombre || perfil.correo,
      correo: perfil.correo,
      telefono: perfil.telefono,
      rtn: perfil.rtn,
      tipo: perfil.tipo_cliente,
      direccion: dir ? `${dir.direccion}, ${dir.colonia}, ${dir.ciudad}, ${dir.departamento}` : null,
    },
    lineas: (q.cotizacion_items as { id: string; variante_id: string; descripcion: string; sku: string; cantidad: number; precio_unitario: number | string; total: number | string }[]).map((i) => ({
      id: i.id,
      varianteId: i.variante_id,
      descripcion: i.descripcion,
      sku: i.sku,
      cantidad: i.cantidad,
      precio: n(i.precio_unitario),
      total: n(i.total),
    })),
  };
}

// ---------------------------------------------------------------------------
// Facturas
// ---------------------------------------------------------------------------

export type FilaFactura = {
  id: string;
  codigo: string;
  pedidoId: string;
  pedidoCodigo: string;
  cliente: string;
  rtn: string | null;
  condicion: string;
  total: number;
  estado: "emitida" | "anulada";
  emitidaEn: string;
};

export async function listarFacturas(): Promise<FilaFactura[]> {
  const { supabase } = await exigirAdmin();
  const { data, error } = await supabase
    .from("facturas")
    .select("id, codigo, pedido_id, cliente_nombre, cliente_rtn, condicion, total, estado, emitida_en, pedidos(codigo)")
    .order("numero", { ascending: false })
    .limit(2000);
  if (error) throw new Error(error.message);
  return (data ?? []).map((f) => ({
    id: f.id,
    codigo: f.codigo,
    pedidoId: f.pedido_id,
    pedidoCodigo: (f.pedidos as unknown as { codigo: string } | null)?.codigo ?? "—",
    cliente: f.cliente_nombre,
    rtn: f.cliente_rtn,
    condicion: f.condicion,
    total: n(f.total),
    estado: f.estado,
    emitidaEn: f.emitida_en,
  }));
}

export async function obtenerFactura(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { supabase } = await exigirAdmin();
  const { data: f } = await supabase
    .from("facturas")
    .select(
      "id, codigo, pedido_id, cliente_nombre, cliente_rtn, cliente_direccion, condicion, emisor, subtotal, descuento, envio, gravado, isv, total, estado, motivo_anulacion, emitida_en, pedidos(codigo, codigo_descuento, descuento_porcentaje, pedido_items(id, producto_nombre, aroma_nombre, tamano, precio_unitario, cantidad, total, variantes(sku)))",
    )
    .eq("id", id)
    .maybeSingle();
  if (!f) return null;
  const ped = f.pedidos as unknown as {
    codigo: string;
    codigo_descuento: string | null;
    descuento_porcentaje: number | null;
    pedido_items: { id: string; producto_nombre: string; aroma_nombre: string | null; tamano: string; precio_unitario: number | string; cantidad: number; total: number | string; variantes: { sku: string } | null }[];
  };
  return {
    id: f.id,
    codigo: f.codigo,
    pedidoId: f.pedido_id,
    pedidoCodigo: ped.codigo,
    cliente: { nombre: f.cliente_nombre, rtn: f.cliente_rtn, direccion: f.cliente_direccion },
    condicion: f.condicion,
    emisor: f.emisor as { razon: string; rtn: string | null; direccion: string; telefono: string; correo: string },
    subtotal: n(f.subtotal),
    descuento: n(f.descuento),
    descuentoPorcentaje: ped.descuento_porcentaje == null ? null : n(ped.descuento_porcentaje),
    envio: n(f.envio),
    gravado: n(f.gravado),
    isv: n(f.isv),
    total: n(f.total),
    estado: f.estado as "emitida" | "anulada",
    motivoAnulacion: f.motivo_anulacion as string | null,
    emitidaEn: f.emitida_en as string,
    lineas: ped.pedido_items.map((i) => ({
      id: i.id,
      sku: i.variantes?.sku ?? "",
      descripcion: [i.producto_nombre, i.aroma_nombre].filter(Boolean).join(" · "),
      precio: n(i.precio_unitario),
      cantidad: i.cantidad,
      total: n(i.total),
    })),
  };
}

/** Factura vigente de un pedido (para el detalle del pedido). */
export async function facturaDePedido(pedidoId: string) {
  const { supabase } = await exigirAdmin();
  const { data } = await supabase.from("facturas").select("id, codigo").eq("pedido_id", pedidoId).eq("estado", "emitida").maybeSingle();
  return data as { id: string; codigo: string } | null;
}

// ---------------------------------------------------------------------------
// Configuración
// ---------------------------------------------------------------------------

export async function configuracionAdmin() {
  const { supabase } = await exigirAdmin();
  const { data, error } = await supabase
    .from("configuracion")
    .select("banco, tipo_cuenta, numero_cuenta, titular, razon_social, rtn_emisor, direccion_emisor, telefono_emisor, correo_emisor")
    .single();
  if (error) throw new Error(error.message);
  return {
    banco: data.banco as string,
    tipoCuenta: data.tipo_cuenta as string,
    numeroCuenta: data.numero_cuenta as string,
    titular: data.titular as string,
    razonSocial: data.razon_social as string,
    rtnEmisor: (data.rtn_emisor as string) ?? "",
    direccionEmisor: data.direccion_emisor as string,
    telefonoEmisor: data.telefono_emisor as string,
    correoEmisor: data.correo_emisor as string,
  };
}

// ---------------------------------------------------------------------------
// Reportes
// ---------------------------------------------------------------------------

/** Ventas confirmadas desde el 1 de enero del año pasado (cubre todos los períodos del reporte). */
export async function datosReportes() {
  const { supabase } = await exigirAdmin(); // primero la sesión: la hora solo se lee al pedir la página
  const desde = `${new Date().getFullYear() - 1}-01-01T00:00:00Z`;
  const [{ data: pedidos, error }, inventario] = await Promise.all([
    supabase
      .from("pedidos")
      .select("id, codigo, estado, total, creado_en, confirmado_en, tipo_cliente, usuario_id, contacto_nombre, pedido_items(producto_nombre, producto_slug, aroma_id, aroma_nombre, tamano, img, cantidad, total)")
      .in("estado", ["confirmado", "enviado", "entregado"])
      .gte("creado_en", desde)
      .order("creado_en")
      .limit(10000),
    listarInventario(),
  ]);
  if (error) throw new Error(error.message);
  return {
    ahora: Date.now(),
    pedidos: (pedidos ?? []).map((p) => ({
      codigo: p.codigo,
      estado: p.estado as EstadoPedido,
      total: n(p.total),
      fecha: (p.confirmado_en ?? p.creado_en) as string,
      tipoCliente: p.tipo_cliente as TipoCliente,
      clienteId: p.usuario_id as string,
      cliente: p.contacto_nombre as string,
      items: (p.pedido_items as { producto_nombre: string; producto_slug: string; aroma_id: string | null; aroma_nombre: string | null; tamano: string; img: string; cantidad: number; total: number | string }[]).map((i) => ({
        producto: i.producto_nombre,
        slug: i.producto_slug,
        aroma: i.aroma_id,
        aromaNombre: i.aroma_nombre,
        img: i.img,
        cantidad: i.cantidad,
        total: n(i.total),
      })),
    })),
    inventario,
  };
}

// ---------------------------------------------------------------------------
// Zonas de entrega (0007)
// ---------------------------------------------------------------------------

/** Todos los municipios (también los desactivados) y el mínimo del envío gratis. */
export async function listarZonasAdmin(): Promise<ZonasEnvio> {
  const { supabase } = await exigirAdmin();
  const [m, c] = await Promise.all([
    supabase.from("municipios").select("id, departamento, nombre, costo_envio, activo").order("departamento").order("nombre"),
    supabase.from("configuracion").select("envio_gratis_desde").single(),
  ]);
  if (m.error) throw new Error(m.error.message);
  if (c.error) throw new Error(c.error.message);
  return {
    municipios: m.data.map((x) => ({
      id: x.id,
      departamento: x.departamento,
      nombre: x.nombre,
      costo: n(x.costo_envio),
      activo: x.activo,
    })),
    gratisDesde: c.data.envio_gratis_desde == null ? null : n(c.data.envio_gratis_desde),
  };
}

// ---------------------------------------------------------------------------
// Inicio editable (0011)
// ---------------------------------------------------------------------------

export type SeccionAdmin = {
  id: string;
  titulo: string;
  descripcion: string;
  modo: "manual" | "mas_vendidos" | "nuevos";
  cantidad: number;
  tema: "claro" | "oscuro";
  categoriaId: string;
  activa: boolean;
  orden: number;
  variantes: string[];
};

export async function listarSeccionesInicio(): Promise<SeccionAdmin[]> {
  const { supabase } = await exigirAdmin();
  const { data, error } = await supabase
    .from("inicio_secciones")
    .select("id, titulo, descripcion, modo, cantidad, tema, categoria_id, activa, orden, inicio_productos(variante_id, orden)")
    .order("orden");
  if (error) throw new Error(error.message);
  return data.map((s) => ({
    id: s.id,
    titulo: s.titulo,
    descripcion: s.descripcion ?? "",
    modo: s.modo,
    cantidad: s.cantidad,
    tema: s.tema,
    categoriaId: s.categoria_id ?? "",
    activa: s.activa,
    orden: s.orden,
    variantes: (s.inicio_productos as { variante_id: string; orden: number }[]).sort((a, b) => a.orden - b.orden).map((x) => x.variante_id),
  }));
}
