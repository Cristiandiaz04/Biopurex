"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hayErrores, validarRegistro, type DatosCuenta, type Errores } from "@/lib/validacion";

export type EstadoAcceso = {
  errores?: Errores<DatosCuenta>;
  mensaje?: string;
  ok?: string;
  valores?: Partial<DatosCuenta>;
};

/** Solo rutas internas (evita redirecciones abiertas a otros sitios). */
function destinoSeguro(v: FormDataEntryValue | null) {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/cuenta";
}

async function origen() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

function leer(fd: FormData): DatosCuenta {
  return {
    nombre: String(fd.get("nombre") ?? ""),
    correo: String(fd.get("correo") ?? "").trim().toLowerCase(),
    contrasena: String(fd.get("contrasena") ?? ""),
  };
}

export async function iniciarSesion(_: EstadoAcceso, fd: FormData): Promise<EstadoAcceso> {
  const d = leer(fd);
  const errores = validarRegistro(d, false);
  if (hayErrores(errores)) return { errores, valores: { correo: d.correo } };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: d.correo, password: d.contrasena });
  if (error) {
    const msg = /confirm/i.test(error.message)
      ? "Confirma tu correo antes de entrar. Revisa tu bandeja de entrada."
      : "Correo o contraseña incorrectos";
    return { mensaje: msg, valores: { correo: d.correo } };
  }
  redirect(destinoSeguro(fd.get("siguiente")));
}

export async function registrarse(_: EstadoAcceso, fd: FormData): Promise<EstadoAcceso> {
  const d = leer(fd);
  const errores = validarRegistro(d, true);
  if (hayErrores(errores)) return { errores, valores: { nombre: d.nombre, correo: d.correo } };

  const supabase = await createClient();
  const siguiente = destinoSeguro(fd.get("siguiente"));
  const { data, error } = await supabase.auth.signUp({
    email: d.correo,
    password: d.contrasena,
    options: {
      data: { nombre: d.nombre.trim() },
      emailRedirectTo: `${await origen()}/auth/confirmar?siguiente=${encodeURIComponent(siguiente)}`,
    },
  });
  if (error) {
    const msg = /registered|already/i.test(error.message) ? "Ya existe una cuenta con ese correo" : "No pudimos crear tu cuenta. Intenta de nuevo.";
    return { mensaje: msg, valores: { nombre: d.nombre, correo: d.correo } };
  }
  // Con confirmación de correo activada no hay sesión todavía.
  if (!data.session) {
    return { ok: `Te enviamos un correo a ${d.correo}. Abre el enlace para activar tu cuenta.` };
  }
  redirect(siguiente);
}

export async function recuperarContrasena(_: EstadoAcceso, fd: FormData): Promise<EstadoAcceso> {
  const correo = String(fd.get("correo") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return { errores: { correo: "Ingresa un correo válido" }, valores: { correo } };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(correo, {
    redirectTo: `${await origen()}/auth/confirmar?siguiente=/cuenta/contrasena`,
  });
  // Mismo mensaje exista o no la cuenta (no revela qué correos están registrados).
  return { ok: "Si hay una cuenta con ese correo, te llegará un enlace para crear una contraseña nueva." };
}

export async function cerrarSesion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
