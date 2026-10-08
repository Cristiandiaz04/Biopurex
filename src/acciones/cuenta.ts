"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { soloDigitos, validarEnvio, type DatosEnvio, type Errores } from "@/lib/validacion";

export type ResultadoForm = { ok?: string; error?: string; errores?: Record<string, string> };

const UUID = /^[0-9a-f-]{36}$/i;

async function conSesion() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
}

export async function guardarDireccion(entrada: {
  id?: string;
  etiqueta: string;
  datos: Omit<DatosEnvio, "correo">;
  predeterminada: boolean;
}): Promise<ResultadoForm> {
  const { supabase, user } = await conSesion();
  if (!user) return { error: "Tu sesión expiró. Vuelve a iniciar sesión." };
  const { datos } = entrada;
  const errores: Errores<DatosEnvio> & { etiqueta?: string } = validarEnvio({ ...datos, correo: "x@x.co" });
  const etiqueta = entrada.etiqueta.trim();
  if (etiqueta.length < 1 || etiqueta.length > 40) errores.etiqueta = "Ponle un nombre (Casa, Oficina…)";
  if (Object.keys(errores).length) return { error: "Revisa los campos marcados.", errores: errores as Record<string, string> };
  if (entrada.id && !UUID.test(entrada.id)) return { error: "Dirección no válida." };

  if (entrada.predeterminada) {
    await supabase.from("direcciones").update({ predeterminada: false }).eq("usuario_id", user.id);
  }
  const fila = {
    etiqueta,
    nombre: datos.nombre.trim(),
    telefono: soloDigitos(datos.telefono),
    departamento: datos.departamento,
    ciudad: datos.ciudad.trim(),
    colonia: datos.colonia.trim(),
    direccion: datos.direccion.trim(),
    referencia: datos.referencia.trim() || null,
    predeterminada: entrada.predeterminada,
  };
  const { error } = entrada.id
    ? await supabase.from("direcciones").update(fila).eq("id", entrada.id)
    : await supabase.from("direcciones").insert(fila);
  if (error) {
    console.error("[guardarDireccion]", error.message);
    return { error: "No pudimos guardar la dirección." };
  }
  revalidatePath("/cuenta");
  return { ok: "Dirección guardada" };
}

export async function eliminarDireccion(id: string): Promise<ResultadoForm> {
  const { supabase, user } = await conSesion();
  if (!user || !UUID.test(id)) return { error: "No se pudo eliminar." };
  const { error } = await supabase.from("direcciones").delete().eq("id", id);
  if (error) return { error: "No se pudo eliminar." };
  revalidatePath("/cuenta");
  return { ok: "Dirección eliminada" };
}

export async function guardarDatos(_: ResultadoForm, fd: FormData): Promise<ResultadoForm> {
  const { supabase, user } = await conSesion();
  if (!user) return { error: "Tu sesión expiró." };
  const nombre = String(fd.get("nombre") ?? "").trim();
  const telefono = soloDigitos(String(fd.get("telefono") ?? ""));
  const rtn = soloDigitos(String(fd.get("rtn") ?? ""));
  const errores: Record<string, string> = {};
  if (nombre.length < 2 || nombre.length > 120) errores.nombre = "Ingresa tu nombre completo";
  if (telefono && telefono.length !== 8) errores.telefono = "El teléfono debe tener 8 dígitos";
  if (rtn && rtn.length !== 14) errores.rtn = "El RTN tiene 14 dígitos";
  if (Object.keys(errores).length) return { errores };
  const { error } = await supabase
    .from("perfiles")
    .update({ nombre, telefono: telefono || null, rtn: rtn || null })
    .eq("id", user.id);
  if (error) return { error: "No pudimos guardar tus datos." };
  revalidatePath("/cuenta/datos");
  return { ok: "Datos guardados" };
}

export async function cambiarContrasena(_: ResultadoForm, fd: FormData): Promise<ResultadoForm> {
  const { supabase, user } = await conSesion();
  if (!user) return { error: "El enlace venció. Pide uno nuevo desde “¿Olvidaste tu contraseña?”." };
  const a = String(fd.get("contrasena") ?? "");
  const b = String(fd.get("confirmar") ?? "");
  if (a.length < 8) return { errores: { contrasena: "Mínimo 8 caracteres" } };
  if (a !== b) return { errores: { confirmar: "Las contraseñas no coinciden" } };
  const { error } = await supabase.auth.updateUser({ password: a });
  if (error) return { error: "No pudimos cambiar la contraseña. Intenta con otra." };
  return { ok: "Contraseña actualizada" };
}
