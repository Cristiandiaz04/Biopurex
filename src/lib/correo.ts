import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

/*
 * Envío de correos por SMTP (Gmail con contraseña de aplicación, o el SMTP de cualquier
 * proveedor). Variables en .env.local / Vercel:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, CORREO_REMITENTE ("BIOPUREX <ventas@...>")
 * Si faltan, no se envía nada (se avisa en el log) y la tienda sigue funcionando.
 */

let transporte: Transporter | null | undefined;

function obtenerTransporte() {
  if (transporte !== undefined) return transporte;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    transporte = null;
    return null;
  }
  const puerto = Number(SMTP_PORT ?? 465);
  transporte = nodemailer.createTransport({
    host: SMTP_HOST,
    port: puerto,
    secure: puerto === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporte;
}

export async function enviarCorreo(c: { para: string; asunto: string; html: string; texto: string }) {
  const t = obtenerTransporte();
  if (!t) {
    console.warn("[correo] SMTP sin configurar; no se envió:", c.asunto);
    return;
  }
  try {
    await t.sendMail({
      from: process.env.CORREO_REMITENTE ?? `BIOPUREX <${process.env.SMTP_USER}>`,
      to: c.para,
      subject: c.asunto,
      html: c.html,
      text: c.texto,
    });
  } catch (e) {
    // Un correo que falla nunca debe romper el pedido.
    console.error("[correo] no se pudo enviar:", c.asunto, e instanceof Error ? e.message : e);
  }
}
