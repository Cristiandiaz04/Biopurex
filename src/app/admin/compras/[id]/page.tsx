import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CheckCircle2, FlaskConical } from "lucide-react";
import { FormularioCompra } from "@/components/admin/formulario-compra";
import { Chip, PuntoAroma, td, th, TituloPagina } from "@/components/admin/ui";
import { listarProveedores, obtenerCompra, opcionesCompra } from "@/lib/datos/admin-docs";
import { lempiras } from "@/lib/formato";
import { cantidad } from "@/lib/unidades";

export const metadata = { title: "Compra" };

async function Compra({ params }: { params: PageProps<"/admin/compras/[id]">["params"] }) {
  const { id } = await params;
  const [c, opciones] = await Promise.all([obtenerCompra(id), opcionesCompra()]);
  if (!c) notFound();
  const porId = new Map(opciones.map((o) => [o.id, o]));
  const titulo = (
    <span className="flex flex-wrap items-center gap-3">
      Compra {c.codigo}
      {c.estado === "recibida" ? <Chip className="h-7 bg-success-50 px-3 font-sans text-[13px] normal-case text-success">Recibida</Chip> : <Chip className="h-7 bg-surface px-3 font-sans text-[13px] normal-case text-text-2">Borrador</Chip>}
    </span>
  );

  if (c.estado === "borrador") {
    const proveedores = await listarProveedores();
    return (
      <>
        <TituloPagina volver={{ href: "/admin/compras", label: "Compras" }} titulo={titulo} />
        <FormularioCompra
          inicial={{ id: c.id, proveedorId: c.proveedorId, facturaProveedor: c.facturaProveedor, fecha: c.fecha, notas: c.notas, lineas: c.lineas }}
          proveedores={proveedores.map((p) => ({ id: p.id, nombre: p.nombre }))}
          opciones={opciones}
          hoy={c.fecha}
        />
      </>
    );
  }

  return (
    <>
      <TituloPagina volver={{ href: "/admin/compras", label: "Compras" }} titulo={titulo} />
      <div className="mb-4 flex items-start gap-2.5 rounded-md bg-success-50 px-4 py-3.5 text-sm leading-normal shadow-[inset_0_0_0_1px_var(--success)]">
        <CheckCircle2 size={20} className="flex-none text-success" aria-hidden />
        <span>
          <strong className="text-success">Recibida el {c.fecha.split("-").reverse().join("/")}.</strong> Lo comprado se sumó al inventario (Entrada en el kardex de cada materia prima o producto).
        </span>
      </div>
      <div className="overflow-hidden rounded-md bg-white shadow-[inset_0_0_0_1px_var(--border)]">
        <div className="flex flex-wrap gap-6 border-b border-line px-4 py-3.5 text-sm">
          <span><span className="text-text-2">Proveedor</span> <Link href={`/admin/proveedores/${c.proveedorId}`} className="font-bold">{c.proveedor}</Link></span>
          <span><span className="text-text-2">Factura</span> <strong className="font-mono">{c.facturaProveedor ?? "—"}</strong></span>
          {c.notas && <span><span className="text-text-2">Notas</span> {c.notas}</span>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse">
            <thead><tr><th className={th}>Artículo</th><th className={`${th} text-right`}>Cantidad</th><th className={`${th} text-right`}>Costo</th><th className={`${th} text-right`}>Subtotal</th></tr></thead>
            <tbody>
              {c.lineas.map((l) => {
                const o = porId.get(l.varianteId);
                return (
                  <tr key={l.id}>
                    <td className={td}>
                      <div className="flex items-center gap-2.5">
                        {o?.unidad ? (
                          <span className="flex size-9 flex-none items-center justify-center rounded-sm bg-surface text-text-2"><FlaskConical size={16} aria-hidden /></span>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={o?.img || "/img/logo.png"} alt="" className="size-9 flex-none object-contain" />
                        )}
                        <div>
                          <div className="font-semibold">{o?.unidad ? o.etiqueta : (o?.producto.replace(/^Reventa · /, "") ?? "Artículo")}</div>
                          <div className="flex items-center gap-1.5 text-xs text-text-2">{o?.unidad ? <>Materia prima · {o.sku}</> : <><PuntoAroma aroma={o?.aroma ?? null} />{o?.etiqueta} · {o?.sku}</>}</div>
                        </div>
                      </div>
                    </td>
                    <td className={`${td} text-right font-semibold tabular-nums text-success`}>+{o?.unidad ? cantidad(l.cantidad, o.unidad) : l.cantidad}</td>
                    <td className={`${td} text-right text-[13px] tabular-nums`}>{lempiras(l.costo)}</td>
                    <td className={`${td} text-right font-bold tabular-nums`}>{lempiras(l.total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end gap-6 px-4 py-3 text-sm tabular-nums">
          <span className="text-text-2">Subtotal {lempiras(c.subtotal)} · ISV {lempiras(c.isv)}</span>
          <strong>Total {lempiras(c.total)}</strong>
        </div>
      </div>
    </>
  );
}

export default function Pagina({ params }: PageProps<"/admin/compras/[id]">) {
  return (
    <Suspense fallback={<div className="h-96 rounded-md bg-white/60" />}>
      <Compra params={params} />
    </Suspense>
  );
}
