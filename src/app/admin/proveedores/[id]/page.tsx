import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { BotonProveedor } from "@/components/admin/proveedores";
import { boton, CabeceraTarjeta, Chip, PuntoAroma, Tarjeta, td, th, TituloPagina } from "@/components/admin/ui";
import { obtenerProveedor, opcionesVariantes } from "@/lib/datos/admin-docs";
import { lempiras } from "@/lib/formato";

export const metadata = { title: "Ficha de proveedor" };

async function Ficha({ params }: { params: PageProps<"/admin/proveedores/[id]">["params"] }) {
  const { id } = await params;
  const [r, opciones] = await Promise.all([obtenerProveedor(id), opcionesVariantes()]);
  if (!r) notFound();
  const { proveedor: p, compras, variantes } = r;
  const total = compras.filter((c) => c.estado === "recibida").reduce((s, c) => s + c.total, 0);
  const suministra = opciones.filter((o) => variantes.has(o.id));

  return (
    <>
      <TituloPagina volver={{ href: "/admin/proveedores", label: "Proveedores" }} titulo={p.nombre} sub={`${p.condiciones} · ${lempiras(total)} comprado`}>
        <BotonProveedor proveedor={p} />
        <Link href={`/admin/compras/nueva?proveedor=${p.id}`} className={`${boton.primario} no-underline`}>
          <Plus size={16} strokeWidth={2.25} aria-hidden />
          Nueva compra
        </Link>
      </TituloPagina>
      <div className="grid grid-cols-1 items-start gap-4 min-[1180px]:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <Tarjeta className="p-4">
            <h2 className="mb-3 mt-0 text-base font-bold">Productos que suministra</h2>
            {suministra.length === 0 ? (
              <p className="m-0 text-sm text-text-2">Aparecen aquí cuando recibas su primera compra.</p>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2.5">
                {suministra.map((o) => (
                  <div key={o.id} className="flex items-center gap-2.5 rounded-sm p-2.5 shadow-[inset_0_0_0_1px_var(--border)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={o.img} alt="" className="size-10 flex-none object-contain" />
                    <span>
                      <span className="block text-sm font-semibold">{o.producto}</span>
                      <span className="flex items-center gap-1.5 text-xs text-text-2"><PuntoAroma aroma={o.aroma} />{o.etiqueta} · {variantes.get(o.id)} u.</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Tarjeta>
          <Tarjeta className="overflow-hidden">
            <CabeceraTarjeta titulo="Historial de compras" />
            {compras.length === 0 ? (
              <p className="m-0 px-4 py-8 text-center text-sm text-text-2">Aún no hay compras a este proveedor.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse">
                  <thead><tr><th className={th}>Compra</th><th className={th}>Fecha</th><th className={th}>Factura</th><th className={`${th} text-right`}>Unidades</th><th className={`${th} text-right`}>Total</th><th className={th}>Estado</th></tr></thead>
                  <tbody>
                    {compras.map((c) => (
                      <tr key={c.id} className="hover:bg-surface">
                        <td className={`${td} font-bold`}><Link href={`/admin/compras/${c.id}`} className="no-underline hover:underline">{c.codigo}</Link></td>
                        <td className={`${td} text-[13px]`}>{c.fecha.split("-").reverse().join("/")}</td>
                        <td className={`${td} font-mono text-xs`}>{c.facturaProveedor ?? "—"}</td>
                        <td className={`${td} text-right text-[13px]`}>{c.unidades}</td>
                        <td className={`${td} text-right font-semibold tabular-nums`}>{lempiras(c.total)}</td>
                        <td className={td}>{c.estado === "recibida" ? <Chip className="bg-success-50 text-success">Recibida</Chip> : <Chip className="bg-surface text-text-2">Borrador</Chip>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Tarjeta>
        </div>
        <Tarjeta className="p-4">
          <h2 className="mb-3 mt-0 text-base font-bold">Datos</h2>
          <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
            <dt className="text-text-2">RTN</dt><dd className="m-0">{p.rtn ?? "—"}</dd>
            <dt className="text-text-2">Contacto</dt><dd className="m-0">{p.contacto ?? "—"}</dd>
            <dt className="text-text-2">Teléfono</dt><dd className="m-0">{p.telefono ? <a href={`tel:+504${p.telefono}`}>{p.telefono.replace(/^(\d{4})(\d{4})$/, "$1-$2")}</a> : "—"}</dd>
            <dt className="text-text-2">Correo</dt><dd className="m-0 [overflow-wrap:anywhere]">{p.correo ?? "—"}</dd>
            <dt className="text-text-2">Dirección</dt><dd className="m-0 leading-[1.4]">{[p.direccion, p.ciudad].filter(Boolean).join(", ") || "—"}</dd>
          </dl>
        </Tarjeta>
      </div>
    </>
  );
}

export default function Pagina({ params }: PageProps<"/admin/proveedores/[id]">) {
  return (
    <Suspense fallback={<div className="h-96 rounded-md bg-white/60" />}>
      <Ficha params={params} />
    </Suspense>
  );
}
