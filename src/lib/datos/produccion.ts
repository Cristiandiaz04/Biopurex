import "server-only";
import { exigirAdmin, listarInventario } from "./admin";

const n = (x: unknown) => Number(x ?? 0);

export type Unidad = "kg" | "g" | "lb" | "L" | "ml" | "gal" | "unidad";
export type MateriaPrima = {
  id: string;
  codigo: string;
  nombre: string;
  unidad: Unidad;
  stock: number;
  minimo: number;
  costo: number | null;
  notas: string | null;
  activo: boolean;
};

const SELECT_MP = "id, codigo, nombre, unidad, stock, stock_minimo, costo_unitario, notas, activo";
const aMateria = (m: Record<string, unknown>): MateriaPrima => ({
  id: m.id as string,
  codigo: m.codigo as string,
  nombre: m.nombre as string,
  unidad: m.unidad as Unidad,
  stock: n(m.stock),
  minimo: n(m.stock_minimo),
  costo: m.costo_unitario == null ? null : n(m.costo_unitario),
  notas: (m.notas as string) ?? null,
  activo: m.activo as boolean,
});

export async function listarMaterias(): Promise<MateriaPrima[]> {
  const { supabase } = await exigirAdmin();
  const { data, error } = await supabase.from("materias_primas").select(SELECT_MP).order("nombre");
  if (error) throw new Error(error.message);
  return (data ?? []).map((m) => aMateria(m));
}

export type MovimientoMateria = { id: string; tipo: "entrada" | "consumo" | "ajuste"; cantidad: number; stock: number; documento: string | null; nota: string | null; creadoEn: string };

export async function obtenerMateria(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { supabase } = await exigirAdmin();
  const [{ data: m }, { data: movs }, { data: usos }] = await Promise.all([
    supabase.from("materias_primas").select(SELECT_MP).eq("id", id).maybeSingle(),
    supabase.from("movimientos_materia").select("id, tipo, cantidad, stock_resultante, documento, nota, creado_en").eq("materia_id", id).order("creado_en", { ascending: false }).limit(500),
    supabase.from("receta_ingredientes").select("cantidad, recetas(variante_id, rendimiento)").eq("materia_id", id),
  ]);
  if (!m) return null;
  return {
    materia: aMateria(m),
    movimientos: (movs ?? []).map((x) => ({ id: x.id, tipo: x.tipo, cantidad: n(x.cantidad), stock: n(x.stock_resultante), documento: x.documento, nota: x.nota, creadoEn: x.creado_en })) as MovimientoMateria[],
    usos: (usos ?? []).map((u) => {
      const r = u.recetas as unknown as { variante_id: string; rendimiento: number | string };
      return { varianteId: r.variante_id, cantidad: n(u.cantidad), rendimiento: n(r.rendimiento) };
    }),
  };
}

// ---------------------------------------------------------------------------
// Reglas de creación
// ---------------------------------------------------------------------------

export type Receta = {
  id: string;
  varianteId: string;
  rendimiento: number;
  notas: string | null;
  ingredientes: { materiaId: string; cantidad: number }[];
};

export async function listarRecetas(): Promise<Receta[]> {
  const { supabase } = await exigirAdmin();
  const { data, error } = await supabase.from("recetas").select("id, variante_id, rendimiento, notas, receta_ingredientes(materia_id, cantidad)");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    varianteId: r.variante_id,
    rendimiento: n(r.rendimiento),
    notas: r.notas,
    ingredientes: (r.receta_ingredientes as { materia_id: string; cantidad: number | string }[]).map((i) => ({ materiaId: i.materia_id, cantidad: n(i.cantidad) })),
  }));
}

/** Variantes del catálogo con su producto (para elegir qué fabricar / a qué ponerle regla). */
export async function variantesFabricables() {
  const inventario = await listarInventario();
  return inventario.flatMap((p) =>
    p.variantes.map((v) => ({
      id: v.id,
      producto: p.nombre,
      slug: p.slug,
      categoria: p.categoria,
      etiqueta: v.etiqueta,
      aroma: v.aroma,
      img: v.img,
      sku: v.sku,
      stock: v.stock,
      activo: v.activo && p.activo,
    })),
  );
}

export type VarianteFabricable = Awaited<ReturnType<typeof variantesFabricables>>[number];

export async function listarProducciones() {
  const { supabase } = await exigirAdmin();
  const { data, error } = await supabase
    .from("producciones")
    .select("id, codigo, variante_id, cantidad, costo_total, costo_unitario, nota, creado_en, produccion_consumos(materia_id, cantidad, costo)")
    .order("numero", { ascending: false })
    .limit(300);
  if (error) throw new Error(error.message);
  return (data ?? []).map((p) => ({
    id: p.id,
    codigo: p.codigo,
    varianteId: p.variante_id,
    cantidad: p.cantidad,
    costoTotal: n(p.costo_total),
    costoUnitario: p.costo_unitario == null ? null : n(p.costo_unitario),
    nota: p.nota,
    creadoEn: p.creado_en,
    consumos: (p.produccion_consumos as { materia_id: string; cantidad: number | string; costo: number | string | null }[]).map((c) => ({
      materiaId: c.materia_id,
      cantidad: n(c.cantidad),
      costo: c.costo == null ? null : n(c.costo),
    })),
  }));
}
