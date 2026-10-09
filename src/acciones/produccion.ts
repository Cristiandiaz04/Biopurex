"use server";

import { revalidatePath, updateTag } from "next/cache";
import { exigirAdmin } from "@/lib/datos/admin";
import type { Resultado } from "./admin";
import { registrar, registrarError } from "@/lib/log";

const UUID = /^[0-9a-f-]{36}$/i;
const UNIDADES = ["kg", "g", "lb", "L", "ml", "gal", "unidad"];

function fallo(contexto: string, error: { code?: string; message: string }): Resultado {
  registrarError(contexto, error);
  if (error.code === "23505") return { error: "Ya existe una materia prima con ese código" };
  return { error: error.code === "P0001" ? error.message : "No se pudo completar la acción. Intenta de nuevo." };
}

const numero = (s: string) => {
  const t = s.trim().replace(/,/g, "");
  if (!t) return null;
  const v = Number(t);
  return Number.isFinite(v) ? v : NaN;
};

// ---------------------------------------------------------------------------
// Materia prima
// ---------------------------------------------------------------------------

export type DatosMateria = { id?: string; codigo: string; nombre: string; unidad: string; minimo: string; costo: string; notas: string; activo: boolean; stockInicial?: string };

export async function guardarMateria(d: DatosMateria): Promise<Resultado & { id?: string }> {
  const e: Record<string, string> = {};
  const codigo = d.codigo.trim().toUpperCase();
  const nombre = d.nombre.trim();
  if (!/^[A-Z0-9-]{2,30}$/.test(codigo)) e.codigo = "2 a 30 letras, números o guiones";
  if (nombre.length < 2 || nombre.length > 120) e.nombre = "Escribe el nombre";
  if (!UNIDADES.includes(d.unidad)) e.unidad = "Elige la unidad";
  const minimo = numero(d.minimo) ?? 0;
  if (Number.isNaN(minimo) || minimo < 0) e.minimo = "Número mayor o igual a 0";
  const costo = numero(d.costo);
  if (costo !== null && (Number.isNaN(costo) || costo < 0)) e.costo = "Costo no válido";
  const inicial = d.stockInicial ? (numero(d.stockInicial) ?? 0) : 0;
  if (Number.isNaN(inicial) || inicial < 0) e.stockInicial = "Número mayor o igual a 0";
  if (d.notas.length > 300) e.notas = "Máximo 300 caracteres";
  if (d.id && !UUID.test(d.id)) return { error: "Materia prima no válida" };
  if (Object.keys(e).length) return { error: "Revisa los campos marcados.", errores: e };

  const { supabase } = await exigirAdmin();
  const fila = { codigo, nombre, unidad: d.unidad, stock_minimo: minimo, costo_unitario: costo, notas: d.notas.trim() || null, activo: d.activo };
  const { data, error } = d.id
    ? await supabase.from("materias_primas").update(fila).eq("id", d.id).select("id").single()
    : await supabase.from("materias_primas").insert(fila).select("id").single();
  if (error) return fallo("guardarMateria", error);
  if (!d.id && inicial > 0) {
    const { error: e2 } = await supabase.rpc("admin_ajustar_materia", { p_materia: data.id, p_cantidad: inicial, p_nota: "Saldo inicial" });
    if (e2) return fallo("stockInicialMateria", e2);
  }
  revalidatePath("/admin/materia-prima");
  return { ok: d.id ? "Materia prima guardada" : "Materia prima creada", id: data.id };
}

export async function ajustarMateria(id: string, cantidad: string, nota: string): Promise<Resultado> {
  const c = numero(cantidad);
  if (!UUID.test(id) || c === null || Number.isNaN(c) || c === 0) return { error: "Indica una cantidad distinta de cero" };
  const { supabase } = await exigirAdmin();
  const { error } = await supabase.rpc("admin_ajustar_materia", { p_materia: id, p_cantidad: c, p_nota: nota.trim().slice(0, 200) });
  if (error) return fallo("ajustarMateria", error);
  revalidatePath(`/admin/materia-prima/${id}`);
  revalidatePath("/admin/materia-prima");
  return { ok: "Stock actualizado" };
}

// ---------------------------------------------------------------------------
// Reglas de creación
// ---------------------------------------------------------------------------

export async function guardarReceta(d: {
  varianteId: string;
  rendimiento: string;
  notas: string;
  ingredientes: { materiaId: string; cantidad: string }[];
}): Promise<Resultado> {
  if (!UUID.test(d.varianteId)) return { error: "Producto no válido" };
  const rend = numero(d.rendimiento);
  if (rend === null || Number.isNaN(rend) || !Number.isInteger(rend) || rend <= 0 || rend > 100000) {
    return { error: "Escribe cuántas unidades salen de una producción (número entero)", errores: { rendimiento: "Entero mayor que 0" } };
  }
  const ings = d.ingredientes.filter((i) => i.materiaId);
  if (!ings.length) return { error: "Agrega al menos una materia prima" };
  const vistos = new Set<string>();
  const filas = [];
  for (const [k, i] of ings.entries()) {
    const c = numero(i.cantidad);
    if (!UUID.test(i.materiaId)) return { error: `Línea ${k + 1}: materia no válida` };
    if (vistos.has(i.materiaId)) return { error: `Línea ${k + 1}: esa materia prima ya está en la regla` };
    if (c === null || Number.isNaN(c) || c <= 0) return { error: `Línea ${k + 1}: cantidad mayor que cero` };
    vistos.add(i.materiaId);
    filas.push({ materia_id: i.materiaId, cantidad: c });
  }
  const { supabase } = await exigirAdmin();
  const { data: receta, error } = await supabase
    .from("recetas")
    .upsert({ variante_id: d.varianteId, rendimiento: rend, notas: d.notas.trim().slice(0, 500) || null, actualizado_en: new Date().toISOString() }, { onConflict: "variante_id" })
    .select("id")
    .single();
  if (error) return fallo("guardarReceta", error);
  const { error: e2 } = await supabase.from("receta_ingredientes").delete().eq("receta_id", receta.id);
  if (e2) return fallo("guardarReceta", e2);
  const { error: e3 } = await supabase.from("receta_ingredientes").insert(filas.map((f) => ({ ...f, receta_id: receta.id })));
  if (e3) return fallo("guardarReceta", e3);
  revalidatePath("/admin/produccion/reglas");
  revalidatePath(`/admin/produccion/reglas/${d.varianteId}`);
  return { ok: "Regla de creación guardada" };
}

// ---------------------------------------------------------------------------
// Producción
// ---------------------------------------------------------------------------

/** Se registra por número de producciones: cada una rinde lo que dice la regla de creación. */
export async function producir(varianteId: string, producciones: number, nota: string): Promise<Resultado & { codigo?: string }> {
  if (!UUID.test(varianteId)) return { error: "Elige el producto" };
  if (!Number.isInteger(producciones) || producciones < 1 || producciones > 1000) return { error: "Elige cuántas producciones hiciste (1 o más)" };
  const { supabase } = await exigirAdmin();
  const { data: receta } = await supabase.from("recetas").select("rendimiento").eq("variante_id", varianteId).maybeSingle();
  if (!receta) return { error: "Este producto no tiene regla de creación. Créala primero." };
  const unidades = producciones * Number(receta.rendimiento);
  if (!Number.isInteger(unidades)) return { error: "La regla tiene un rendimiento con decimales: corrígela con unidades enteras." };
  const detalle = `${producciones} ${producciones === 1 ? "producción" : "producciones"} de ${Number(receta.rendimiento)}`;
  const { data, error } = await supabase.rpc("admin_producir", {
    p_variante: varianteId,
    p_cantidad: unidades,
    p_nota: [detalle, nota.trim()].filter(Boolean).join(" · ").slice(0, 300),
  });
  if (error) return fallo("producir", error);
  registrar("produccion", { codigo: data as string, unidades, producciones });
  updateTag("catalogo"); // hay nuevo stock disponible en la tienda
  revalidatePath("/admin/produccion");
  revalidatePath("/admin/materia-prima");
  revalidatePath("/admin/productos");
  return { ok: `Producción ${data} registrada`, codigo: data as string };
}
