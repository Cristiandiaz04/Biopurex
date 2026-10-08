/** Lempiras con formato hondureño de catálogo: "L. 1,250.00". */
export function lempiras(n: number | null | undefined) {
  if (n == null) return "Consultar precio";
  return "L. " + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
