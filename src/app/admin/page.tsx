import Link from "next/link";
import { Suspense } from "react";
import { AlertTriangle, CalendarDays, ChevronRight, Clock, TrendingUp, Wallet } from "lucide-react";
import { CabeceraTarjeta, Chip, CHIP_ESTADO, hace, nombreAroma, PuntoAroma, Tarjeta, td, th, TituloPagina } from "@/components/admin/ui";
import { datosDashboard } from "@/lib/datos/admin";
import { lempiras } from "@/lib/formato";
import { ETIQUETA_ESTADO } from "@/lib/pedidos";

export const metadata = { title: "Dashboard" };

const VENDIDO = new Set(["confirmado", "enviado", "entregado"]);
const diaHN = (d: Date | string) => new Date(d).toLocaleDateString("en-CA", { timeZone: "America/Tegucigalpa" });
const corto = (n: number) => (n >= 1000 ? `${Math.round(n / 100) / 10} mil` : String(Math.round(n)));

async function Dashboard() {
  const { ahora, pedidos, items, inventario, cuentasPorCobrar } = await datosDashboard();
  const hoy = diaHN(new Date(ahora));
  const ventas = pedidos.filter((p) => VENDIDO.has(p.estado));
  const porDia = new Map<string, number>();
  for (const p of ventas) {
    const d = diaHN(p.confirmadoEn ?? p.creadoEn);
    porDia.set(d, (porDia.get(d) ?? 0) + p.total);
  }
  const dias = Array.from({ length: 30 }, (_, i) => diaHN(new Date(ahora - (29 - i) * 864e5)));
  const serie = dias.map((d) => ({ d, v: porDia.get(d) ?? 0 }));
  const max = Math.max(1, ...serie.map((s) => s.v));
  const total30 = serie.reduce((s, x) => s + x.v, 0);
  const suma = (n: number) => serie.slice(-n).reduce((s, x) => s + x.v, 0);
  const mes = hoy.slice(0, 7);
  const delMes = serie.filter((s) => s.d.startsWith(mes)).reduce((s, x) => s + x.v, 0);
  const pendientes = pedidos.filter((p) => p.estado === "esperando_pago" || p.estado === "pago_en_revision");
  const enRevision = pendientes.filter((p) => p.estado === "pago_en_revision").length;

  const top = [...items.reduce((m, i) => {
    const k = `${i.nombre}|${i.aroma ?? ""}`;
    const prev = m.get(k) ?? { ...i, cantidad: 0, total: 0 };
    prev.cantidad += i.cantidad;
    prev.total += i.total;
    return m.set(k, prev);
  }, new Map<string, (typeof items)[number]>()).values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
  const topMax = Math.max(1, ...top.map((t) => t.total));

  const bajos = inventario
    .flatMap((p) => p.variantes.filter((v) => v.activo && p.activo).map((v) => ({ p, v, disp: v.stock - v.apartado })))
    .filter((x) => x.disp <= x.v.minimo)
    .sort((a, b) => a.disp - b.disp);

  const kpis = [
    { label: "Ventas de hoy", valor: lempiras(porDia.get(hoy) ?? 0), sub: `${ventas.filter((p) => diaHN(p.confirmadoEn ?? p.creadoEn) === hoy).length} pedidos · día en curso`, icono: Clock, href: "/admin/pedidos" },
    { label: "Últimos 7 días", valor: lempiras(suma(7)), sub: `${lempiras(suma(14) - suma(7))} la semana anterior`, icono: TrendingUp, href: "/admin/pedidos" },
    { label: "Mes en curso", valor: lempiras(delMes), sub: "Pedidos confirmados", icono: CalendarDays, href: "/admin/pedidos" },
    { label: "Pedidos por confirmar", valor: String(pendientes.length), sub: `${enRevision} con comprobante por revisar`, icono: Clock, href: "/admin/pedidos?estado=por_confirmar", alerta: enRevision > 0 },
    { label: "Cuentas por cobrar", valor: lempiras(cuentasPorCobrar), sub: "Saldo de clientes a crédito", icono: Wallet, href: "/admin/pedidos" },
  ];

  return (
    <>
      <TituloPagina titulo="Dashboard" sub="Ventas de pedidos confirmados, enviados y entregados." />
      <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(min(100%,210px),1fr))] gap-3">
        {kpis.map(({ label, valor, sub, icono: Icono, href, alerta }) => (
          <Link key={label} href={href} className="flex flex-col gap-2 rounded-md bg-white px-[18px] py-4 no-underline shadow-[inset_0_0_0_1px_var(--border)] transition-shadow hover:shadow-[inset_0_0_0_1.5px_var(--navy)]">
            <span className="flex items-center gap-2 text-[13px] font-semibold text-text-2">
              <span className="flex size-[30px] flex-none items-center justify-center rounded-full bg-navy-50 text-navy">
                <Icono size={16} strokeWidth={2.25} aria-hidden />
              </span>
              {label}
            </span>
            <span className="text-[26px] font-bold leading-[1.1] tracking-[-.01em] tabular-nums">{valor}</span>
            <span className={`text-xs font-semibold ${alerta ? "text-warning" : "text-text-2"}`}>{sub}</span>
          </Link>
        ))}
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 min-[1180px]:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Tarjeta>
          <CabeceraTarjeta titulo="Ventas · últimos 30 días">
            <span className="text-[13px] text-text-2">
              Total <strong className="text-navy tabular-nums">{lempiras(total30)}</strong>
            </span>
          </CabeceraTarjeta>
          <div className="px-4 pb-3.5 pt-[18px]">
            <div className="flex gap-2.5">
              <div className="-mt-1.5 flex h-[200px] w-[52px] flex-none flex-col items-end justify-between text-[11px] tabular-nums text-text-2">
                <span>{corto(max)}</span>
                <span>{corto(max / 2)}</span>
                <span>0</span>
              </div>
              <div className="relative h-[200px] min-w-0 flex-1">
                <div className="absolute inset-x-0 top-0 border-t border-dashed border-line" />
                <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-line" />
                <div className="absolute inset-0 flex items-end gap-[3px] border-b border-line">
                  {serie.map((s) => (
                    <div
                      key={s.d}
                      title={`${s.d}: ${lempiras(s.v)}`}
                      className={`min-w-0 flex-1 rounded-t-[3px] hover:bg-navy-700 ${s.d === hoy ? "bg-green" : "bg-navy"}`}
                      style={{ height: `${(s.v / max) * 100}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-3 flex gap-4 text-xs text-text-2">
              <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] bg-navy" />Día cerrado</span>
              <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] bg-green" />Hoy (parcial)</span>
            </div>
          </div>
        </Tarjeta>
        <Tarjeta>
          <CabeceraTarjeta titulo="Top 5 productos · 30 días" />
          {top.length === 0 ? (
            <p className="m-0 px-4 py-10 text-center text-sm text-text-2">Todavía no hay ventas confirmadas.</p>
          ) : (
            <ol className="m-0 list-none py-1.5 pl-0">
              {top.map((t, i) => (
                <li key={t.nombre + t.aroma} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="font-display w-5 flex-none text-xl text-text-2">{i + 1}</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={t.img} alt="" className="size-10 flex-none object-contain" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="truncate text-sm font-semibold">{t.nombre}</div>
                    <div className="flex items-center gap-1.5 text-xs text-text-2">
                      <PuntoAroma aroma={t.aroma} />
                      {t.aromaNombre ?? nombreAroma(t.aroma)} · {t.tamano}
                    </div>
                    <div className="h-1 rounded-sm bg-surface">
                      <div className="h-full rounded-sm bg-navy" style={{ width: `${(t.total / topMax) * 100}%` }} />
                    </div>
                  </div>
                  <div className="flex-none text-right tabular-nums">
                    <div className="text-sm font-bold">{lempiras(t.total)}</div>
                    <div className="text-xs text-text-2">{t.cantidad} u.</div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Tarjeta>
      </div>

      <div className="grid grid-cols-1 gap-4 min-[1180px]:grid-cols-2">
        <Tarjeta className="overflow-hidden">
          <CabeceraTarjeta titulo={<>Pedidos por confirmar <span className="font-semibold text-text-2">· {pendientes.length}</span></>}>
            <Link href="/admin/pedidos?estado=por_confirmar" className="flex h-9 items-center gap-1 rounded-full px-2.5 text-[13px] font-semibold no-underline hover:bg-surface">
              Ver todos <ChevronRight size={16} aria-hidden />
            </Link>
          </CabeceraTarjeta>
          {pendientes.length === 0 ? (
            <p className="m-0 px-4 py-10 text-center text-sm text-text-2">No hay pedidos esperando confirmación.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse">
                <thead>
                  <tr><th className={th}>Pedido</th><th className={th}>Cliente</th><th className={`${th} text-right`}>Total</th><th className={th}>Estado</th></tr>
                </thead>
                <tbody>
                  {pendientes.slice(0, 6).map((p) => (
                    <tr key={p.id} className="hover:bg-surface">
                      <td className={td}>
                        <Link href={`/admin/pedidos/${p.codigo}`} className="font-bold no-underline hover:underline">{p.codigo}</Link>
                        <div className="text-xs text-text-2">{hace(p.creadoEn)}</div>
                      </td>
                      <td className={td}>{p.cliente}</td>
                      <td className={`${td} whitespace-nowrap text-right font-semibold tabular-nums`}>{lempiras(p.total)}</td>
                      <td className={td}><Chip className={CHIP_ESTADO[p.estado]}>{ETIQUETA_ESTADO[p.estado]}</Chip></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Tarjeta>
        <Tarjeta className="overflow-hidden">
          <CabeceraTarjeta titulo={<>Stock bajo por variante <span className="font-semibold text-error">· {bajos.length}</span></>}>
            <Link href="/admin/productos?vista=variantes&bajo=1" className="flex h-9 items-center gap-1 rounded-full px-2.5 text-[13px] font-semibold no-underline hover:bg-surface">
              Inventario <ChevronRight size={16} aria-hidden />
            </Link>
          </CabeceraTarjeta>
          {bajos.length === 0 ? (
            <p className="m-0 px-4 py-10 text-center text-sm text-text-2">Todo el inventario está sobre su mínimo.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] border-collapse">
                <thead>
                  <tr><th className={th}>Producto · aroma</th><th className={`${th} text-right`}>Disponible / mín.</th></tr>
                </thead>
                <tbody>
                  {bajos.slice(0, 8).map(({ p, v, disp }) => (
                    <tr key={v.id}>
                      <td className={td}>
                        <Link href={`/admin/productos/${p.slug}?variante=${v.id}`} className="flex items-center gap-2.5 no-underline">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={v.img} alt="" className="size-[34px] flex-none object-contain" />
                          <span className="flex flex-col gap-0.5">
                            <span className="font-semibold">{p.nombre}</span>
                            <span className="flex items-center gap-1.5 text-xs text-text-2"><PuntoAroma aroma={v.aroma} />{v.etiqueta}</span>
                          </span>
                        </Link>
                      </td>
                      <td className={`${td} whitespace-nowrap text-right tabular-nums`}>
                        <strong className="text-error">{disp}</strong> <span className="text-text-2">/ {v.minimo}</span>
                        {disp <= 0 && <AlertTriangle size={14} className="ml-1 inline text-error" aria-label="Agotado" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Tarjeta>
      </div>
    </>
  );
}

export default function Pagina() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-md bg-white/60" />}>
      <Dashboard />
    </Suspense>
  );
}
