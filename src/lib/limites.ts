import "server-only";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { clientePublico } from "@/lib/supabase/publico";
import { registrar } from "@/lib/log";

/*
 * Límite de intentos para login, registro y recuperar contraseña (migración 0013).
 * Supabase ve todas las solicitudes desde la IP de Vercel, así que su límite por IP no distingue
 * a un atacante: este cuenta por IP real del visitante y por correo.
 * Las claves se guardan como HMAC con LIMITE_SECRETO (variable del servidor): la base nunca ve el
 * correo ni la IP, y nadie puede bloquear a otra persona sin conocer el secreto.
 */
type Regla = { max: number; minutos: number };

const REGLAS = {
  "login-ip": { max: 20, minutos: 15 },
  "login-correo": { max: 5, minutos: 15 },
  "registro-ip": { max: 5, minutos: 60 },
  "recuperar-ip": { max: 10, minutos: 60 },
  "recuperar-correo": { max: 3, minutos: 60 },
} satisfies Record<string, Regla>;

type Tipo = keyof typeof REGLAS;

async function ipVisitante() {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "desconocida").trim();
}

function huella(tipo: Tipo, valor: string) {
  const secreto = process.env.LIMITE_SECRETO;
  // Sin secreto se sigue limitando (por IP y correo) pero con una huella menos protegida: avisar.
  if (!secreto) registrar("limite_sin_secreto", {}, "aviso");
  return `${tipo}:${createHmac("sha256", secreto ?? "biopurex-sin-secreto").update(valor.toLowerCase()).digest("base64url").slice(0, 43)}`;
}

/**
 * true si se permite el intento. Si la base no responde (p. ej. falta la migración) se permite,
 * para no dejar a nadie sin poder entrar por un problema del limitador.
 */
export async function permitirIntento(accion: "login" | "registro" | "recuperar", correo?: string): Promise<boolean> {
  const sb = clientePublico();
  const pruebas: [Tipo, string][] = [[`${accion}-ip` as Tipo, await ipVisitante()]];
  if (correo && `${accion}-correo` in REGLAS) pruebas.push([`${accion}-correo` as Tipo, correo]);
  for (const [tipo, valor] of pruebas) {
    const regla = REGLAS[tipo];
    const { data, error } = await sb.rpc("permitir_intento", { p_clave: huella(tipo, valor), p_max: regla.max, p_minutos: regla.minutos });
    if (error) {
      registrar("limite_no_disponible", { mensaje: error.message.slice(0, 120) }, "aviso");
      return true;
    }
    if (data === false) {
      registrar("limite_alcanzado", { tipo }, "aviso");
      return false;
    }
  }
  return true;
}

export const MENSAJE_LIMITE = "Demasiados intentos seguidos. Espera unos minutos y vuelve a probar.";
