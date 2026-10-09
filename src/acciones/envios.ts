"use server";

import { updateTag } from "next/cache";
import { exigirAdmin } from "@/lib/datos/admin";
import { DEPARTAMENTOS } from "@/lib/validacion";
import type { Resultado } from "./admin";
import { registrarError } from "@/lib/log";

const UUID = /^[0-9a-f-]{36}$/i;
const nombreValido = (s: string) => s.trim().length >= 2 && s.trim().length <= 80;

/** "1,250.50" → 1250.5 · vacío → null · otra cosa → "error" */
function monto(s: string): number | null | "error" {
  const t = s.replace(/,/g, "").trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 && n <= 1_000_000 ? Math.round(n * 100) / 100 : "error";
}

function errorBd(e: { code?: string; message: string }, duplicado: string): Resultado {
  if (e.code === "23505") return { error: duplicado };
  registrarError("envios", e);
  return { error: "No se pudo guardar. Intenta de nuevo." };
}

export type DatosMunicipio = { id?: string; departamento: string; nombre: string; costo: string; activo: boolean };

export async function guardarMunicipio(d: DatosMunicipio): Promise<Resultado> {
  const errores: Record<string, string> = {};
  if (!(DEPARTAMENTOS as readonly string[]).includes(d.departamento)) errores.departamento = "Elige un departamento";
  if (!nombreValido(d.nombre)) errores.nombre = "Escribe el nombre del municipio";
  const costo = monto(d.costo);
  if (costo === "error" || costo === null) errores.costo = "Monto no válido";
  if (d.id && !UUID.test(d.id)) return { error: "Municipio no válido" };
  if (Object.keys(errores).length) return { error: "Revisa los campos marcados.", errores };

  const { supabase } = await exigirAdmin();
  const fila = { departamento: d.departamento, nombre: d.nombre.trim(), costo_envio: costo as number, activo: d.activo };
  const { error } = d.id ? await supabase.from("municipios").update(fila).eq("id", d.id) : await supabase.from("municipios").insert(fila);
  if (error) return errorBd(error, "Ese municipio ya existe en el departamento");
  updateTag("zonas");
  return { ok: "Municipio guardado" };
}

export async function eliminarMunicipio(id: string): Promise<Resultado> {
  if (!UUID.test(id)) return { error: "Municipio no válido" };
  const { supabase } = await exigirAdmin();
  // Los pedidos y direcciones guardan el nombre como texto: borrar no los afecta.
  const { error } = await supabase.from("municipios").delete().eq("id", id);
  if (error) return errorBd(error, "");
  updateTag("zonas");
  return { ok: "Municipio eliminado" };
}

/** Vacío = nunca hay envío gratis. */
export async function guardarEnvioGratis(desde: string): Promise<Resultado> {
  const m = monto(desde);
  if (m === "error") return { error: "Monto no válido" };
  const { supabase } = await exigirAdmin();
  const { error } = await supabase.from("configuracion").update({ envio_gratis_desde: m }).eq("id", true);
  if (error) return errorBd(error, "");
  updateTag("zonas");
  return { ok: m == null ? "Envío gratis desactivado" : "Monto guardado" };
}
