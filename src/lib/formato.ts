/** "Aldea El Carmen, San Pedro Sula, Cortés" (sin repetir si la ciudad es el municipio). */
export function lugar(ciudad: string, municipio: string | null | undefined, departamento: string) {
  const muni = municipio && municipio.trim().toLowerCase() !== ciudad.trim().toLowerCase() ? municipio : null;
  return [ciudad, muni, departamento].filter(Boolean).join(", ");
}

/** Lempiras con formato hondureño de catálogo: "L. 1,250.00". */
export function lempiras(n: number | null | undefined) {
  if (n == null) return "Consultar precio";
  return "L. " + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
