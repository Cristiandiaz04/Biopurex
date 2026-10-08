import Link from "next/link";
import { Suspense } from "react";
import { ControlesReporte, PERIODOS } from "@/components/admin/reportes-controles";
import { Chip, CHIP_TIPO, nombreAroma, PuntoAroma, td, th, TituloPagina } from "@/components/admin/ui";
import { aromaVar, esAroma } from "@/lib/catalogo";
import { ETIQUETA_TIPO } from "@/lib/datos/admin";
import { datosReportes } from "@/lib/datos/admin-docs";
import { lempiras } from "@/lib/formato";

export const metadata = { title: "Reportes" };

const PESTANAS = [
  ["periodo", "Por período"],
  ["producto", "Por producto"],
  ["aroma", "Por aroma"],
  ["cliente", "Por cliente"],
  ["inventario", "Inventario valorizado"],
] as const;
type Pestana = (typeof PESTANAS)[number][0];

const diaHN = (d: Date | string | number) => new Date(d).toLocaleDateString("en-CA", { timeZone: "America/Tegucigalpa" });

function inicio(periodo: string, ahora: number) {
  const hoy = diaHN(ahora);
  if (periodo === "mes") return `${hoy.slice(0, 7)}-01`;
  if (periodo === "anio") return `${hoy.slice(0, 4)}-01-01`;
  return diaHN(ahora - (periodo === "90" ? 89 : 29) * 864e5);
}

function Barra({ pct, color = "var(--navy)" }: { pct: number; color?: string }) {
  return (
    <div className="h-2.5 rounded-[5px] bg-surface">
      <div className="h-full rounded-[5px]" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }} />
    </div>
  );
}

async function Reportes({ searchParams }: { searchParams: PageProps<"/admin/reportes">["searchParams"] }) {
  const sp = await searchParams;
  const tab: Pestana = PESTANAS.some(([k]) => k === sp.tab) ? (sp.tab as Pestana) : "periodo";
  const periodo = PERIODOS.some(([k]) => k === sp.periodo) ? (sp.periodo as string) : "30";
  const { ahora, pedidos: todos, inventario } = await datosReportes();
  const desde = inicio(periodo, ahora);
  const pedidos = todos.filter((p) => diaHN(p.fecha) >= desde);
  const totalVentas = pedidos.reduce((s, p) => s + p.total, 0);
  const etiquetaPeriodo = PERIODOS.find(([k]) => k === periodo)![1];

  let tabla: React.ReactNode = null;
  let csv: (string | number)[][] = [];
  let resumen = "";

  if (tab === "periodo") {
    const porMes = periodo === "anio" || periodo === "90";
    const grupos = new Map<string, { n: number; v: number }>();
    for (const p of pedidos) {
      const k = porMes ? diaHN(p.fecha).slice(0, 7) : diaHN(p.fecha);
      const g = grupos.get(k) ?? { n: 0, v: 0 };
      g.n++;
      g.v += p.total;
      grupos.set(k, g);
    }
    const filas = [...grupos.entries()].sort(([a], [b]) => b.localeCompare(a));
    const max = Math.max(1, ...filas.map(([, g]) => g.v));
    const etiqueta = (k: string) =>
      porMes
        ? new Date(`${k}-15T12:00:00`).toLocaleDateString("es-HN", { month: "long", year: "numeric" })
        : new Date(`${k}T12:00:00`).toLocaleDateString("es-HN", { weekday: "short", day: "numeric", month: "short" });
    resumen = `Total ${lempiras(totalVentas)} · ${pedidos.length} pedidos`;
    csv = [[porMes ? "Mes" : "Día", "Pedidos", "Ventas"], ...filas.map(([k, g]) => [k, g.n, g.v.toFixed(2)])];
    tabla = (
      <table className="w-full min-w-[640px] border-collapse">
        <thead><tr><th className={th}>{porMes ? "Mes" : "Día"}</th><th className={`${th} text-right`}>Pedidos</th><th className={`${th} text-right`}>Ventas</th><th className={`${th} w-[40%]`}></th></tr></thead>
        <tbody>
          {filas.map(([k, g]) => (
            <tr key={k}>
              <td className={`${td} whitespace-nowrap font-semibold capitalize`}>{etiqueta(k)}</td>
              <td className={`${td} text-right tabular-nums`}>{g.n}</td>
              <td className={`${td} whitespace-nowrap text-right font-bold tabular-nums`}>{lempiras(g.v)}</td>
              <td className={td}><Barra pct={(g.v / max) * 100} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  } else if (tab === "producto" || tab === "aroma") {
    const grupos = new Map<string, { nombre: string; img: string; aroma: string | null; u: number; v: number; prods: Set<string> }>();
    for (const p of pedidos)
      for (const i of p.items) {
        const k = tab === "producto" ? i.producto : (i.aroma ?? "_sin");
        const g = grupos.get(k) ?? { nombre: tab === "producto" ? i.producto : (i.aromaNombre ?? nombreAroma(i.aroma)), img: i.img, aroma: i.aroma, u: 0, v: 0, prods: new Set() };
        g.u += i.cantidad;
        g.v += i.total;
        g.prods.add(i.producto);
        grupos.set(k, g);
      }
    const filas = [...grupos.values()].sort((a, b) => b.v - a.v);
    const total = filas.reduce((s, f) => s + f.v, 0);
    const max = Math.max(1, ...filas.map((f) => f.v));
    resumen = `Total ${lempiras(total)} en productos (sin envío)`;
    csv = [[tab === "producto" ? "Producto" : "Aroma", "Unidades", "Ventas", "Participación %"], ...filas.map((f) => [f.nombre, f.u, f.v.toFixed(2), total ? ((f.v / total) * 100).toFixed(1) : "0"])];
    tabla = (
      <table className="w-full min-w-[720px] border-collapse">
        <thead><tr><th className={th}>{tab === "producto" ? "Producto" : "Aroma"}</th>{tab === "aroma" && <th className={th}>Productos</th>}<th className={`${th} text-right`}>Unidades</th><th className={`${th} text-right`}>Ventas</th><th className={`${th} text-right`}>Participación</th><th className={`${th} w-[28%]`}></th></tr></thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.nombre}>
              <td className={td}>
                {tab === "producto" ? (
                  <div className="flex items-center gap-2.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.img} alt="" className="size-[34px] flex-none object-contain" />
                    <span className="font-semibold">{f.nombre}</span>
                  </div>
                ) : (
                  <span className="flex items-center gap-2.5 whitespace-nowrap font-semibold"><PuntoAroma aroma={f.aroma} tam={20} />{f.nombre}</span>
                )}
              </td>
              {tab === "aroma" && <td className={`${td} text-[13px] text-text-2`}>{[...f.prods].join(", ")}</td>}
              <td className={`${td} text-right tabular-nums`}>{f.u}</td>
              <td className={`${td} whitespace-nowrap text-right font-bold tabular-nums`}>{lempiras(f.v)}</td>
              <td className={`${td} text-right text-[13px] text-text-2`}>{total ? Math.round((f.v / total) * 100) : 0} %</td>
              <td className={td}><Barra pct={(f.v / max) * 100} color={tab === "aroma" && esAroma(f.aroma) ? aromaVar(f.aroma) : undefined} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  } else if (tab === "cliente") {
    const grupos = new Map<string, { nombre: string; tipo: (typeof pedidos)[number]["tipoCliente"]; n: number; v: number }>();
    for (const p of pedidos) {
      const g = grupos.get(p.clienteId) ?? { nombre: p.cliente, tipo: p.tipoCliente, n: 0, v: 0 };
      g.n++;
      g.v += p.total;
      grupos.set(p.clienteId, g);
    }
    const filas = [...grupos.entries()].sort(([, a], [, b]) => b.v - a.v);
    const max = Math.max(1, ...filas.map(([, f]) => f.v));
    resumen = `${filas.length} clientes · ${lempiras(totalVentas)}`;
    csv = [["Cliente", "Etiqueta", "Pedidos", "Ventas"], ...filas.map(([, f]) => [f.nombre, ETIQUETA_TIPO[f.tipo], f.n, f.v.toFixed(2)])];
    tabla = (
      <table className="w-full min-w-[720px] border-collapse">
        <thead><tr><th className={th}>Cliente</th><th className={th}>Etiqueta</th><th className={`${th} text-right`}>Pedidos</th><th className={`${th} text-right`}>Ventas</th><th className={`${th} w-[28%]`}></th></tr></thead>
        <tbody>
          {filas.map(([id, f]) => (
            <tr key={id}>
              <td className={`${td} font-semibold`}><Link href={`/admin/clientes/${id}`} className="no-underline hover:underline">{f.nombre}</Link></td>
              <td className={td}><Chip className={CHIP_TIPO[f.tipo]}>{ETIQUETA_TIPO[f.tipo]}</Chip></td>
              <td className={`${td} text-right`}>{f.n}</td>
              <td className={`${td} whitespace-nowrap text-right font-bold tabular-nums`}>{lempiras(f.v)}</td>
              <td className={td}><Barra pct={(f.v / max) * 100} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  } else {
    const filas = inventario.flatMap((p) => p.variantes.map((v) => ({ p, v, valor: (p.costo ?? 0) * v.stock, venta: (p.precio ?? 0) * v.stock })));
    const unidades = filas.reduce((s, f) => s + f.v.stock, 0);
    const valor = filas.reduce((s, f) => s + f.valor, 0);
    const venta = filas.reduce((s, f) => s + f.venta, 0);
    const sinCosto = inventario.filter((p) => p.costo == null && p.variantes.some((v) => v.stock > 0)).length;
    resumen = `${unidades} unidades · ${lempiras(valor)} al costo (a precio de venta ${lempiras(venta)})${sinCosto ? ` · ${sinCosto} productos sin costo` : ""}`;
    csv = [["Producto", "Aroma", "SKU", "Stock", "Costo unitario", "Valor"], ...filas.map((f) => [f.p.nombre, f.v.etiqueta, f.v.sku, f.v.stock, f.p.costo?.toFixed(2) ?? "", f.valor.toFixed(2)])];
    tabla = (
      <table className="w-full min-w-[760px] border-collapse">
        <thead><tr><th className={th}>Variante</th><th className={th}>SKU</th><th className={`${th} text-right`}>Stock</th><th className={`${th} text-right`}>Costo unit.</th><th className={`${th} text-right`}>Valor</th></tr></thead>
        <tbody>
          {filas.map(({ p, v, valor }) => (
            <tr key={v.id}>
              <td className={td}>
                <div className="flex items-center gap-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={v.img} alt="" className="size-8 flex-none object-contain" />
                  <div>
                    <div className="font-semibold">{p.nombre}</div>
                    <div className="flex items-center gap-1.5 text-xs text-text-2"><PuntoAroma aroma={v.aroma} />{v.etiqueta} · {p.categoriaCorto}</div>
                  </div>
                </div>
              </td>
              <td className={`${td} whitespace-nowrap font-mono text-xs text-text-2`}>{v.sku}</td>
              <td className={`${td} text-right tabular-nums`}>{v.stock}</td>
              <td className={`${td} whitespace-nowrap text-right text-[13px] tabular-nums`}>{p.costo == null ? <span className="text-warning">Sin costo</span> : lempiras(p.costo)}</td>
              <td className={`${td} whitespace-nowrap text-right font-bold tabular-nums`}>{lempiras(valor)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  const href = (t: string) => `/admin/reportes?tab=${t}&periodo=${periodo}`;
  const titulo = PESTANAS.find(([k]) => k === tab)![1];

  return (
    <>
      <TituloPagina titulo="Reportes" sub={tab === "inventario" ? "Existencias de hoy" : `${etiquetaPeriodo} · pedidos confirmados, enviados y entregados`}>
        <ControlesReporte csv={csv} nombre={`reporte-${tab}`} conPeriodo={tab !== "inventario"} />
      </TituloPagina>
      <div role="tablist" className="no-scrollbar mb-4 flex w-fit max-w-full gap-1 overflow-x-auto rounded-full bg-white p-1 shadow-[inset_0_0_0_1px_var(--border)] print:hidden">
        {PESTANAS.map(([k, l]) => (
          <Link key={k} href={href(k)} role="tab" aria-selected={tab === k} scroll={false} className={`flex h-9 flex-none items-center whitespace-nowrap rounded-full px-4 text-[13px] font-semibold no-underline ${tab === k ? "bg-navy text-white" : ""}`}>
            {l}
          </Link>
        ))}
      </div>
      <div className="overflow-hidden rounded-md bg-white shadow-[inset_0_0_0_1px_var(--border)] print:shadow-none">
        <div className="flex flex-wrap justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="m-0 text-base font-bold">{tab === "inventario" ? "Inventario valorizado al costo · hoy" : `Ventas ${titulo.toLowerCase()}`}</h2>
          <span className="text-sm">{resumen}</span>
        </div>
        {csv.length <= 1 ? (
          <p className="m-0 px-4 py-12 text-center text-sm text-text-2">No hay ventas confirmadas en este período.</p>
        ) : (
          <div className="overflow-x-auto">{tabla}</div>
        )}
      </div>
    </>
  );
}

export default function Pagina({ searchParams }: PageProps<"/admin/reportes">) {
  return (
    <Suspense fallback={<div className="h-96 rounded-md bg-white/60" />}>
      <Reportes searchParams={searchParams} />
    </Suspense>
  );
}
