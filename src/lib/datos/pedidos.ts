import "server-only";
import { lugar } from "@/lib/formato";
import type { EstadoPedido } from "@/lib/pedidos";
import { createClient } from "@/lib/supabase/server";

export type ResumenPedido = {
  id: string;
  codigo: string;
  estado: EstadoPedido;
  total: number;
  creadoEn: string;
  cantidad: number;
  miniaturas: { img: string; aroma: string | null }[];
};

export type ItemPedido = {
  id: string;
  slug: string;
  nombre: string;
  aroma: string | null;
  aromaNombre: string | null;
  tamano: string;
  img: string;
  precio: number;
  cantidad: number;
  total: number;
};

export type MensajePedido = { id: string; texto: string; deAdmin: boolean; creadoEn: string };

export type DetallePedido = ResumenPedido & {
  tipoCliente: string;
  subtotal: number;
  descuento: number;
  codigoDescuento: string | null;
  descuentoPorcentaje: number | null;
  envio: number;
  zonaEnvio: "sps" | "resto";
  contacto: { nombre: string; correo: string; telefono: string };
  direccion: string;
  comprobante: string | null;
  motivoCancelacion: string | null;
  /** Motivo si el admin marcó un problema con el pago (el pedido vuelve a esperando pago). */
  problemaPago: string | null;
  fechas: Partial<Record<EstadoPedido, string | null>>;
  items: ItemPedido[];
  mensajes: MensajePedido[];
};

const n = (x: unknown) => Number(x ?? 0);

/** Pedidos del usuario con sesión (RLS: solo los propios). */
export async function listarPedidos(): Promise<ResumenPedido[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pedidos")
    .select("id, codigo, estado, total, creado_en, pedido_items(img, aroma_id, cantidad)")
    .order("creado_en", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []).map((p) => ({
    id: p.id,
    codigo: p.codigo,
    estado: p.estado,
    total: n(p.total),
    creadoEn: p.creado_en,
    cantidad: p.pedido_items.reduce((s: number, i: { cantidad: number }) => s + i.cantidad, 0),
    miniaturas: p.pedido_items.slice(0, 3).map((i: { img: string; aroma_id: string | null }) => ({ img: i.img, aroma: i.aroma_id })),
  }));
}

export async function obtenerPedido(codigo: string): Promise<DetallePedido | null> {
  if (!/^BPX-\d{1,12}$/.test(codigo)) return null;
  const supabase = await createClient();
  const { data: p } = await supabase
    .from("pedidos")
    .select(
      "id, codigo, estado, tipo_cliente, subtotal, descuento, codigo_descuento, descuento_porcentaje, envio, total, zona_envio, contacto_nombre, contacto_correo, contacto_telefono, departamento, municipio, ciudad, colonia, direccion, referencia, comprobante_path, motivo_cancelacion, problema_pago, creado_en, pago_revision_en, confirmado_en, enviado_en, entregado_en, cancelado_en, pedido_items(id, producto_slug, producto_nombre, aroma_id, aroma_nombre, tamano, img, precio_unitario, cantidad, total), pedido_mensajes(id, texto, de_admin, creado_en)",
    )
    .eq("codigo", codigo)
    .maybeSingle();
  if (!p) return null;

  const items: ItemPedido[] = p.pedido_items.map((i: Record<string, unknown>) => ({
    id: i.id as string,
    slug: i.producto_slug as string,
    nombre: i.producto_nombre as string,
    aroma: (i.aroma_id as string) ?? null,
    aromaNombre: (i.aroma_nombre as string) ?? null,
    tamano: i.tamano as string,
    img: i.img as string,
    precio: n(i.precio_unitario),
    cantidad: i.cantidad as number,
    total: n(i.total),
  }));

  return {
    id: p.id,
    codigo: p.codigo,
    estado: p.estado,
    tipoCliente: p.tipo_cliente,
    total: n(p.total),
    subtotal: n(p.subtotal),
    descuento: n(p.descuento),
    codigoDescuento: p.codigo_descuento,
    descuentoPorcentaje: p.descuento_porcentaje == null ? null : n(p.descuento_porcentaje),
    envio: n(p.envio),
    zonaEnvio: p.zona_envio,
    creadoEn: p.creado_en,
    cantidad: items.reduce((s, i) => s + i.cantidad, 0),
    miniaturas: items.slice(0, 3).map((i) => ({ img: i.img, aroma: i.aroma })),
    contacto: { nombre: p.contacto_nombre, correo: p.contacto_correo, telefono: p.contacto_telefono },
    direccion: [p.direccion, p.colonia, lugar(p.ciudad, p.municipio, p.departamento), p.referencia].filter(Boolean).join(" · "),
    comprobante: p.comprobante_path ? (p.comprobante_path as string).split("/").pop()!.replace(/^\d+-/, "") : null,
    motivoCancelacion: p.motivo_cancelacion,
    problemaPago: p.problema_pago ?? null,
    fechas: {
      esperando_pago: p.creado_en,
      pago_en_revision: p.pago_revision_en,
      confirmado: p.confirmado_en,
      enviado: p.enviado_en,
      entregado: p.entregado_en,
      cancelado: p.cancelado_en,
    },
    items,
    mensajes: (p.pedido_mensajes as { id: string; texto: string; de_admin: boolean; creado_en: string }[])
      .sort((a, b) => a.creado_en.localeCompare(b.creado_en))
      .map((m) => ({ id: m.id, texto: m.texto, deAdmin: m.de_admin, creadoEn: m.creado_en })),
  };
}
