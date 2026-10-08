/** Unidades de la materia prima (mismos valores que materias_primas.unidad). */
export const UNIDADES = [
  { id: "kg", label: "Kilogramos (kg)" },
  { id: "g", label: "Gramos (g)" },
  { id: "lb", label: "Libras (lb)" },
  { id: "L", label: "Litros (L)" },
  { id: "ml", label: "Mililitros (ml)" },
  { id: "gal", label: "Galones (gal)" },
  { id: "unidad", label: "Unidades" },
] as const;

/** 12.5 + "lb" → "12.5 lb" (hasta 3 decimales). */
export const cantidad = (n: number, unidad: string) =>
  `${n.toLocaleString("en-US", { maximumFractionDigits: 3 })} ${unidad === "unidad" ? (n === 1 ? "unidad" : "unidades") : unidad}`;

type MateriaCalc = { id: string; nombre: string; unidad: string; stock: number; costo: number | null };
type RecetaCalc = { rendimiento: number; ingredientes: { materiaId: string; cantidad: number }[] };

/**
 * Consumo de una producción según la regla de creación (igual que admin_producir en la BD:
 * necesario = cantidad por lote × unidades ÷ rendimiento, redondeado a 3 decimales).
 */
export function calcularProduccion(receta: RecetaCalc, unidades: number, materias: MateriaCalc[]) {
  const porId = new Map(materias.map((m) => [m.id, m]));
  const lineas = receta.ingredientes.map((i) => {
    const m = porId.get(i.materiaId);
    const necesario = Math.round(((i.cantidad * unidades) / receta.rendimiento) * 1000) / 1000;
    const stock = m?.stock ?? 0;
    return {
      materiaId: i.materiaId,
      nombre: m?.nombre ?? "Materia prima",
      unidad: m?.unidad ?? "",
      necesario,
      stock,
      falta: stock < necesario,
      costo: m?.costo == null ? null : Math.round(necesario * m.costo * 100) / 100,
    };
  });
  const sinCosto = lineas.some((l) => l.costo === null);
  const costoTotal = lineas.reduce((s, l) => s + (l.costo ?? 0), 0);
  // Máximo de unidades enteras que alcanza el stock actual.
  const maximo = receta.ingredientes.length
    ? Math.floor(
        Math.min(
          ...receta.ingredientes.map((i) => {
            const stock = porId.get(i.materiaId)?.stock ?? 0;
            return (stock * receta.rendimiento) / i.cantidad + 1e-9;
          }),
        ),
      )
    : 0;
  return {
    lineas,
    faltantes: lineas.filter((l) => l.falta),
    costoTotal: Math.round(costoTotal * 100) / 100,
    costoUnitario: sinCosto || unidades < 1 ? null : Math.round((costoTotal / unidades) * 100) / 100,
    sinCosto,
    maximo,
  };
}
