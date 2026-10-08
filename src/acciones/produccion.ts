"use server";

import { revalidatePath, updateTag } from "next/cache";
import { exigirAdmin } from "@/lib/datos/admin";
import type { Resultado } from "./admin";

const UUID = /^[0-9a-f-]{36}$/i;
const UNIDADES = ["kg", "g", "lb", "L", "ml", "gal", "unidad"];

function fallo(contexto: string, error: { code?: string; message: string }): Resultado {
  console.error(`[${contexto}]`, error.code, error.message);
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
  if (rend === null || Number.isNaN(rend) || rend <= 0 || rend > 100000) return { error: "El rendimiento debe ser mayor que cero", errores: { rendimiento: "Mayor que 0" } };
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

export async function producir(varianteId: string, cantidad: number, nota: string): Promise<Resultado & { codigo?: string }> {
  if (!UUID.test(varianteId)) return { error: "Elige el producto" };
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 100000) return { error: "La cantidad debe ser un número entero mayor que 0" };
  const { supabase } = await exigirAdmin();
  const { data, error } = await supabase.rpc("admin_producir", { p_variante: varianteId, p_cantidad: cantidad, p_nota: nota.trim().slice(0, 300) || null });
  if (error) return fallo("producir", error);
  updateTag("catalogo"); // hay nuevo stock disponible en la tienda
  revalidatePath("/admin/produccion");
  revalidatePath("/admin/materia-prima");
  revalidatePath("/admin/productos");
  return { ok: `Producción ${data} registrada`, codigo: data as string };
}
