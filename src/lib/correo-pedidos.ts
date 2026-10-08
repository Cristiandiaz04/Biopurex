import "server-only";
import { headers } from "next/headers";
import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { obtenerConfiguracion } from "@/lib/datos/catalogo";
import { lempiras } from "@/lib/formato";
import { enviarCorreo } from "./correo";

/** Momentos del pedido que le llegan al cliente por correo. */
export type EventoPedido = "creado" | "en_revision" | "problema_pago" | "confirmado" | "enviado" | "entregado" | "cancelado";

// Los clientes de correo no leen variables CSS: son los mismos valores de globals.css (--navy, --green…).
const C = { navy: "#1e2a5e", green: "#5bae4e", surface: "#f7f8fa", border: "#e6e8ee", text2: "#5b6478", warning: "#9a5200" };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

type Item = { producto_nombre: string; aroma_nombre: string | null; cantidad: number; total: number | string };
type Fila = {
  codigo: string;
  estado: string;
  tipo_cliente: string;
  contacto_nombre: string;
  contacto_correo: string;
  subtotal: number | string;
  descuento: number | string;
  envio: number | string;
  total: number | string;
  motivo_cancelacion: string | null;
  problema_pago: string | null;
  pedido_items: Item[];
};

async function sitio() {
  if (process.env.SITIO_URL) return process.env.SITIO_URL.replace(/\/$/, "");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
}

function contenido(e: EventoPedido, p: Fila, banco: Awaited<ReturnType<typeof obtenerConfiguracion>>) {
  const nombre = esc(p.contacto_nombre.split(" ")[0] || p.contacto_nombre);
  const total = lempiras(Number(p.total));
  switch (e) {
    case "creado":
      return p.estado === "esperando_pago"
        ? {
            asunto: `Recibimos tu pedido ${p.codigo}`,
            titulo: "¡Gracias por tu pedido!",
            parrafos: [
              `Hola ${nombre}, tu pedido <strong>${p.codigo}</strong> quedó registrado.`,
              `Para confirmarlo, transfiere <strong>${total}</strong> y sube el comprobante desde tu pedido.`,
              `<strong>${esc(banco.banco)}</strong> · ${esc(banco.tipoCuenta)}<br>Cuenta <strong>${esc(banco.numeroCuenta)}</strong> a nombre de ${esc(banco.titular)}`,
            ],
            boton: "Subir comprobante",
          }
        : {
            asunto: `Tu pedido ${p.codigo} está confirmado`,
            titulo: "¡Pedido confirmado!",
            parrafos: [
              `Hola ${nombre}, tu pedido <strong>${p.codigo}</strong> está confirmado y en proceso de entrega.`,
              p.tipo_cliente === "credito" ? `Se sumó ${total} al saldo de tu cuenta.` : `Pagas ${total} al recibirlo.`,
            ],
            boton: "Ver mi pedido",
          };
    case "en_revision":
      return {
        asunto: `Estamos revisando tu pago · ${p.codigo}`,
        titulo: "Recibimos tu comprobante",
        parrafos: [`Hola ${nombre}, tu pago del pedido <strong>${p.codigo}</strong> está en proceso de revisión.`, "Te avisaremos por este medio en cuanto lo confirmemos."],
        boton: "Ver mi pedido",
      };
    case "problema_pago":
      return {
        asunto: `Hubo un problema con tu pago · ${p.codigo}`,
        titulo: "Hubo un problema con tu pago",
        parrafos: [
          `Hola ${nombre}, revisamos el comprobante del pedido <strong>${p.codigo}</strong> y no pudimos confirmarlo:`,
          `<span style="color:${C.warning}"><strong>${esc(p.problema_pago ?? "")}</strong></span>`,
          `Tu pedido sigue activo. Sube un nuevo comprobante de <strong>${total}</strong> para continuar.`,
        ],
        boton: "Subir otro comprobante",
      };
    case "confirmado":
      return {
        asunto: `Pago confirmado · ${p.codigo}`,
        titulo: "¡Tu pedido está confirmado!",
        parrafos: [`Hola ${nombre}, confirmamos tu pago. Tu pedido <strong>${p.codigo}</strong> está confirmado y en proceso de entrega.`],
        boton: "Ver mi pedido",
      };
    case "enviado":
      return {
        asunto: `Tu pedido ${p.codigo} va en camino`,
        titulo: "Tu pedido va en camino",
        parrafos: [`Hola ${nombre}, tu pedido <strong>${p.codigo}</strong> salió a entrega. Pronto lo tendrás contigo.`],
        boton: "Ver mi pedido",
      };
    case "entregado":
      return {
        asunto: `Pedido entregado · ${p.codigo}`,
        titulo: "¡Pedido entregado!",
        parrafos: [`Hola ${nombre}, tu pedido <strong>${p.codigo}</strong> fue entregado.`, "Gracias por comprar en BIOPUREX."],
        boton: "Ver mi pedido",
      };
    case "cancelado":
      return {
        asunto: `Pedido cancelado · ${p.codigo}`,
        titulo: "Tu pedido fue cancelado",
        parrafos: [`Hola ${nombre}, tu pedido <strong>${p.codigo}</strong> fue cancelado.`, p.motivo_cancelacion ? `Motivo: ${esc(p.motivo_cancelacion)}` : "", "Si tienes dudas, escríbenos desde el chat de tu pedido."].filter(Boolean),
        boton: "Ver mi pedido",
      };
  }
}

function html(titulo: string, parrafos: string[], p: Fila, boton: string, enlace: string) {
  const filas = p.pedido_items
    .map(
      (i) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid ${C.border}">${i.cantidad} × ${esc(i.producto_nombre)}${i.aroma_nombre ? ` · ${esc(i.aroma_nombre)}` : ""}</td><td style="padding:8px 0;border-bottom:1px solid ${C.border};text-align:right;white-space:nowrap">${lempiras(Number(i.total))}</td></tr>`,
    )
    .join("");
  const linea = (l: string, v: string, fuerte = false) =>
    `<tr><td style="padding:4px 0;color:${fuerte ? C.navy : C.text2};${fuerte ? "font-weight:700;font-size:16px" : ""}">${l}</td><td style="padding:4px 0;text-align:right;${fuerte ? "font-weight:700;font-size:16px" : ""}">${v}</td></tr>`;
  return `<!doctype html><html lang="es"><body style="margin:0;background:${C.surface};font-family:Arial,Helvetica,sans-serif;color:${C.navy}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.surface};padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:${C.navy};padding:18px 24px;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:.04em">BIO<span style="color:${C.green}">PUREX</span></td></tr>
<tr><td style="padding:28px 24px 8px">
<h1 style="margin:0 0 14px;font-size:22px">${titulo}</h1>
${parrafos.map((x) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.55">${x}</p>`).join("")}
<p style="margin:20px 0 24px"><a href="${enlace}" style="display:inline-block;background:${C.navy};color:#ffffff;text-decoration:none;font-weight:700;padding:13px 24px;border-radius:999px">${boton}</a></p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">${filas}
${linea("Subtotal", lempiras(Number(p.subtotal)))}
${Number(p.descuento) > 0 ? linea("Descuento", `−${lempiras(Number(p.descuento))}`) : ""}
${linea("Envío", Number(p.envio) === 0 ? "Gratis" : lempiras(Number(p.envio)))}
${linea("Total", lempiras(Number(p.total)), true)}</table>
</td></tr>
<tr><td style="padding:16px 24px 24px;font-size:12px;color:${C.text2}">BIOPUREX · San Pedro Sula, Honduras. Recibes este correo por tu pedido ${p.codigo}.</td></tr>
</table></td></tr></table></body></html>`;
}

/**
 * Prepara el correo del pedido con la sesión actual (cliente o admin) y lo envía después de
 * responder (after), para no hacer esperar a nadie. Nunca lanza error.
 */
export async function notificarPedido(supabase: SupabaseClient, codigo: string, evento: EventoPedido) {
  try {
    const [{ data }, banco, base] = await Promise.all([
      supabase
        .from("pedidos")
        .select("codigo, estado, tipo_cliente, contacto_nombre, contacto_correo, subtotal, descuento, envio, total, motivo_cancelacion, problema_pago, pedido_items(producto_nombre, aroma_nombre, cantidad, total)")
        .eq("codigo", codigo)
        .maybeSingle(),
      obtenerConfiguracion(),
      sitio(),
    ]);
    if (!data) return;
    const p = data as unknown as Fila;
    const c = contenido(evento, p, banco);
    const enlace = `${base}/pedidos/${p.codigo}`;
    const texto = [c.titulo, ...c.parrafos.map((x) => x.replace(/<br>/g, "\n").replace(/<[^>]+>/g, "")), `Total: ${lempiras(Number(p.total))}`, enlace].join("\n\n");
    after(() => enviarCorreo({ para: p.contacto_correo, asunto: c.asunto, html: html(c.titulo, c.parrafos, p, c.boton, enlace), texto }));
  } catch (e) {
    console.error("[notificarPedido]", evento, codigo, e instanceof Error ? e.message : e);
  }
}
