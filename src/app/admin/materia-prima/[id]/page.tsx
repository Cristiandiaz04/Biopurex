import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Truck } from "lucide-react";
import { BotonAjusteMateria, BotonMateria } from "@/components/admin/materia-prima";
import { cantidad } from "@/lib/unidades";
import { boton, CabeceraTarjeta, Chip, fechaCorta, PuntoAroma, Tarjeta, td, th, TituloPagina } from "@/components/admin/ui";
import { obtenerMateria, variantesFabricables } from "@/lib/datos/produccion";
import { lempiras } from "@/lib/formato";

export const metadata = { title: "Materia prima" };

const TIPO = {
  entrada: ["Entrada", "bg-success-50 text-success"],
  consumo: ["Consumo", "bg-navy-50 text-navy"],
  ajuste: ["Ajuste", "bg-error-50 text-error"],
} as const;

async function Materia({ params }: { params: PageProps<"/admin/materia-prima/[id]">["params"] }) {
  const { id } = await params;
  const [r, variantes] = await Promise.all([obtenerMateria(id), variantesFabricables()]);
  if (!r) notFound();
  const { materia: m, movimientos, usos } = r;
  const porId = new Map(variantes.map((v) => [v.id, v]));

  return (
    <>
      <TituloPagina volver={{ href: "/admin/materia-prima", label: "Materia prima" }} titulo={m.nombre} sub={<span className="font-mono">{m.codigo}</span>}>
        <BotonMateria materia={m} />
        <BotonAjusteMateria materia={m} />
        <Link href={`/admin/compras/nueva?materia=${m.id}`} className={`${boton.primario} no-underline`}>
          <Truck size={16} aria-hidden />
          Comprar
        </Link>
      </TituloPagina>
      <div className="mb-4 grid grid-cols-2 gap-2.5 min-[900px]:grid-cols-4">
        <div className="rounded-sm bg-white p-3 shadow-[inset_0_0_0_1px_var(--border)]"><div className="text-xs font-semibold text-text-2">Stock</div><div className={`text-[22px] font-bold tabular-nums ${m.stock <= m.minimo ? "text-error" : ""}`}>{cantidad(m.stock, m.unidad)}</div></div>
        <div className="rounded-sm bg-white p-3 shadow-[inset_0_0_0_1px_var(--border)]"><div className="text-xs font-semibold text-text-2">Mínimo</div><div className="text-[22px] font-bold tabular-nums">{cantidad(m.minimo, m.unidad)}</div></div>
        <div className="rounded-sm bg-white p-3 shadow-[inset_0_0_0_1px_var(--border)]"><div className="text-xs font-semibold text-text-2">Costo</div><div className="text-[22px] font-bold tabular-nums">{m.costo == null ? "—" : `${lempiras(m.costo)}`}</div><div className="text-xs text-text-2">por {m.unidad}</div></div>
        <div className="rounded-sm bg-white p-3 shadow-[inset_0_0_0_1px_var(--border)]"><div className="text-xs font-semibold text-text-2">Valor al costo</div><div className="text-[22px] font-bold tabular-nums">{m.costo == null ? "—" : lempiras(m.costo * m.stock)}</div></div>
      </div>
      <div className="grid grid-cols-1 items-start gap-4 min-[1180px]:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Tarjeta className="overflow-hidden">
          <CabeceraTarjeta titulo="Kardex" />
          {movimientos.length === 0 ? (
            <p className="m-0 px-4 py-8 text-center text-sm text-text-2">Sin movimientos todavía. Entra con una compra o un ajuste.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse">
                <thead><tr><th className={th}>Fecha</th><th className={th}>Movimiento</th><th className={th}>Documento</th><th className={th}>Detalle</th><th className={`${th} text-right`}>Cantidad</th><th className={`${th} text-right`}>Stock</th></tr></thead>
                <tbody>
                  {movimientos.map((x) => (
                    <tr key={x.id}>
                      <td className={`${td} whitespace-nowrap text-[13px]`}>{fechaCorta(x.creadoEn, true)}</td>
                      <td className={td}><Chip className={TIPO[x.tipo][1]}>{TIPO[x.tipo][0]}</Chip></td>
                      <td className={`${td} whitespace-nowrap text-[13px] font-semibold`}>{x.documento ?? "—"}</td>
                      <td className={`${td} text-[13px] text-text-2`}>{x.nota ?? ""}</td>
                      <td className={`${td} whitespace-nowrap text-right font-semibold tabular-nums ${x.cantidad > 0 ? "text-success" : ""}`}>{x.cantidad > 0 ? "+" : "−"}{cantidad(Math.abs(x.cantidad), m.unidad)}</td>
                      <td className={`${td} whitespace-nowrap text-right font-bold tabular-nums`}>{cantidad(x.stock, m.unidad)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Tarjeta>
        <Tarjeta className="p-4">
          <h2 className="mb-3 mt-0 text-base font-bold">Se usa en</h2>
          {usos.length === 0 ? (
            <p className="m-0 text-sm text-text-2">Todavía no está en ninguna regla de creación.</p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {usos.map((u) => {
                const v = porId.get(u.varianteId);
                return (
                  <li key={u.varianteId}>
                    <Link href={`/admin/produccion/reglas/${u.varianteId}`} className="flex items-center gap-2.5 rounded-sm p-2 no-underline shadow-[inset_0_0_0_1px_var(--border)] hover:bg-surface">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={v?.img ?? "/img/logo.png"} alt="" className="size-9 flex-none object-contain" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{v?.producto ?? "Producto"}</span>
                        <span className="flex items-center gap-1.5 text-xs text-text-2"><PuntoAroma aroma={v?.aroma ?? null} />{v?.etiqueta} · {cantidad(u.cantidad, m.unidad)} por producción de {u.rendimiento} u.</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          {m.notas && <p className="mb-0 mt-4 text-sm text-text-2">{m.notas}</p>}
        </Tarjeta>
      </div>
    </>
  );
}

export default function Pagina({ params }: PageProps<"/admin/materia-prima/[id]">) {
  return (
    <Suspense fallback={<div className="h-96 rounded-md bg-white/60" />}>
      <Materia params={params} />
    </Suspense>
  );
}
