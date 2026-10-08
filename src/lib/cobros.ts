/*
 * Cuentas por cobrar (clientes a crédito).
 * El saldo real vive en perfiles.saldo (lo mueven crear_pedido, cancelar y los abonos).
 * Aquí solo se reparte lo ya pagado entre los pedidos, del más antiguo al más nuevo (FIFO),
 * para saber qué documento sigue pendiente y con qué antigüedad.
 */

export type Documento = { codigo: string; fecha: string; total: number };
export type DocumentoPendiente = Documento & { abonado: number; pendiente: number; dias: number; tramo: Tramo };
export type Tramo = "0-30" | "31-60" | "+60";

export const tramoDe = (dias: number): Tramo => (dias <= 30 ? "0-30" : dias <= 60 ? "31-60" : "+60");

export function documentosPendientes(docs: Documento[], saldo: number, ahora: number): DocumentoPendiente[] {
  const ordenados = [...docs].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const deuda = ordenados.reduce((s, d) => s + d.total, 0);
  // Lo pagado = lo facturado a crédito − lo que se debe. Nunca negativo.
  let pagado = Math.max(0, Math.round((deuda - saldo) * 100) / 100);
  const res: DocumentoPendiente[] = [];
  for (const d of ordenados) {
    const abonado = Math.min(d.total, pagado);
    pagado = Math.round((pagado - abonado) * 100) / 100;
    const pendiente = Math.round((d.total - abonado) * 100) / 100;
    if (pendiente <= 0) continue;
    const dias = Math.max(0, Math.floor((ahora - new Date(d.fecha).getTime()) / 864e5));
    res.push({ ...d, abonado, pendiente, dias, tramo: tramoDe(dias) });
  }
  return res;
}

export function porTramo(pendientes: DocumentoPendiente[]) {
  const t: Record<Tramo, number> = { "0-30": 0, "31-60": 0, "+60": 0 };
  for (const p of pendientes) t[p.tramo] = Math.round((t[p.tramo] + p.pendiente) * 100) / 100;
  return t;
}
