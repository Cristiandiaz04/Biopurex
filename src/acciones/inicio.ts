"use server";

import { revalidatePath, updateTag } from "next/cache";
import { exigirAdmin } from "@/lib/datos/admin";
import type { Resultado } from "./admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MODOS = ["manual", "mas_vendidos", "nuevos"];

export type DatosSeccion = {
  id?: string;
  titulo: string;
  descripcion: string;
  modo: string;
  cantidad: number;
  tema: string;
  categoriaId: string;
  activa: boolean;
  /** Solo en modo manual: variantes (producto + aroma) en orden. */
  variantes: string[];
};

function listo(): void {
  updateTag("catalogo"); // el inicio usa la misma caché que el catálogo
  revalidatePath("/admin/inicio");
}

export async function guardarSeccion(d: DatosSeccion): Promise<Resultado & { id?: string }> {
  const errores: Record<string, string> = {};
  const titulo = d.titulo.trim();
  const descripcion = d.descripcion.trim();
  if (titulo.length < 2 || titulo.length > 60) errores.titulo = "Escribe el título (2 a 60 letras)";
  if (descripcion.length > 300) errores.descripcion = "Máximo 300 caracteres";
  if (!MODOS.includes(d.modo)) errores.modo = "Elige qué productos mostrar";
  if (!Number.isInteger(d.cantidad) || d.cantidad < 1 || d.cantidad > 12) errores.cantidad = "Entre 1 y 12";
  if (d.tema !== "claro" && d.tema !== "oscuro") errores.tema = "Tema no válido";
  if (d.categoriaId && !/^[a-z0-9-]{1,60}$/.test(d.categoriaId)) errores.categoriaId = "Categoría no válida";
  const variantes = [...new Set(d.variantes)];
  if (variantes.some((v) => !UUID.test(v)) || variantes.length > 12) errores.variantes = "Productos no válidos";
  if (d.modo === "manual" && variantes.length === 0) errores.variantes = "Agrega al menos un producto";
  if (d.id && !UUID.test(d.id)) return { error: "Sección no válida" };
  if (Object.keys(errores).length) return { error: "Revisa los campos marcados.", errores };

  const { supabase } = await exigirAdmin();
  const fila = {
    titulo,
    descripcion: descripcion || null,
    modo: d.modo,
    cantidad: d.cantidad,
    tema: d.tema,
    categoria_id: d.categoriaId || null,
    activa: d.activa,
  };
  let id = d.id;
  if (id) {
    const { error } = await supabase.from("inicio_secciones").update(fila).eq("id", id);
    if (error) return fallo(error);
  } else {
    const { data: ult } = await supabase.from("inicio_secciones").select("orden").order("orden", { ascending: false }).limit(1).maybeSingle();
    const { data, error } = await supabase
      .from("inicio_secciones")
      .insert({ ...fila, orden: (ult?.orden ?? 0) + 1 })
      .select("id")
      .single();
    if (error) return fallo(error);
    id = data.id as string;
  }
  // Productos: se reemplazan por la lista nueva (solo importan en modo manual).
  const { error: e1 } = await supabase.from("inicio_productos").delete().eq("seccion_id", id);
  if (e1) return fallo(e1);
  if (d.modo === "manual" && variantes.length) {
    const { error: e2 } = await supabase.from("inicio_productos").insert(variantes.map((v, i) => ({ seccion_id: id, variante_id: v, orden: i })));
    if (e2) return fallo(e2);
  }
  listo();
  return { ok: "Sección guardada", id };
}

export async function eliminarSeccion(id: string): Promise<Resultado> {
  if (!UUID.test(id)) return { error: "Sección no válida" };
  const { supabase } = await exigirAdmin();
  const { error } = await supabase.from("inicio_secciones").delete().eq("id", id);
  if (error) return fallo(error);
  listo();
  return { ok: "Sección eliminada" };
}

/** Sube o baja una sección un lugar (intercambia el orden con la vecina). */
export async function moverSeccion(id: string, direccion: "arriba" | "abajo"): Promise<Resultado> {
  if (!UUID.test(id)) return { error: "Sección no válida" };
  const { supabase } = await exigirAdmin();
  const { data } = await supabase.from("inicio_secciones").select("id, orden").order("orden");
  const lista = data ?? [];
  const i = lista.findIndex((s) => s.id === id);
  const j = direccion === "arriba" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= lista.length) return { ok: "Sin cambios" };
  // Reenumera para que no haya empates.
  const orden = lista.map((s) => s.id);
  [orden[i], orden[j]] = [orden[j], orden[i]];
  for (const [k, sid] of orden.entries()) {
    const { error } = await supabase.from("inicio_secciones").update({ orden: k + 1 }).eq("id", sid);
    if (error) return fallo(error);
  }
  listo();
  return { ok: "Orden actualizado" };
}

function fallo(error: { code?: string; message: string }): Resultado {
  console.error("[inicio]", error.code, error.message);
  return { error: "No se pudo guardar. Intenta de nuevo." };
}
