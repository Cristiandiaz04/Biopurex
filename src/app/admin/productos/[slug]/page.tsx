import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ExternalLink, Plus } from "lucide-react";
import { FormularioProducto } from "@/components/admin/formulario-producto";
import { GestorVariantes } from "@/components/admin/gestor-variantes";
import { boton, TituloPagina } from "@/components/admin/ui";
import { categoria, esCategoria } from "@/lib/catalogo";
import { kardex, listarInventario } from "@/lib/datos/admin";

export const metadata = { title: "Producto" };

async function Producto({ params, searchParams }: { params: PageProps<"/admin/productos/[slug]">["params"]; searchParams: PageProps<"/admin/productos/[slug]">["searchParams"] }) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const todos = await listarInventario();
  const p = todos.find((x) => x.slug === slug);
  if (!p) notFound();
  const movimientos = await kardex(p.variantes.map((v) => v.id));
  const hermanos = todos.filter((x) => x.linea === p.linea);
  const variante = typeof sp.variante === "string" ? sp.variante : null;

  return (
    <>
      <TituloPagina
        volver={{ href: "/admin/productos", label: "Productos" }}
        titulo={
          <span className="flex items-center gap-4">
            <span className="flex size-[72px] flex-none items-center justify-center rounded-md bg-white shadow-[inset_0_0_0_1px_var(--border)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.variantes[0]?.img ?? "/img/logo.png"} alt="" className="size-[60px] object-contain" />
            </span>
            {p.nombre}
          </span>
        }
        sub={
          <>
            {esCategoria(p.categoria) ? categoria(p.categoria).nombre : p.categoria} · {p.variantes.length} variantes
            {hermanos.length > 1 && (
              <>
                {" · Presentaciones: "}
                {hermanos.map((h, i) => (
                  <span key={h.id}>
                    {i > 0 && ", "}
                    {h.id === p.id ? <strong>{h.tamano}</strong> : <Link href={`/admin/productos/${h.slug}`}>{h.tamano}</Link>}
                  </span>
                ))}
              </>
            )}
          </>
        }
      >
        <a href={`/producto/${p.slug}`} target="_blank" rel="noopener noreferrer" className={`${boton.secundario} no-underline`}>
          <ExternalLink size={16} aria-hidden />
          Ver en la tienda
        </a>
        <Link
          href={`/admin/productos/nuevo?linea=${encodeURIComponent(p.linea)}&base=${encodeURIComponent(p.nombreBase)}&cat=${p.categoria}`}
          className={`${boton.secundario} no-underline`}
        >
          <Plus size={16} aria-hidden />
          Agregar presentación
        </Link>
      </TituloPagina>

      {sp.creado === "1" && (
        <div role="status" className="mb-4 rounded-md bg-success-50 px-4 py-3 text-sm font-semibold text-success">
          Producto creado. Ahora agrégale sus aromas con foto y stock para que aparezca en la tienda.
        </div>
      )}

      <GestorVariantes productoId={p.id} slug={p.slug} costo={p.costo} variantes={p.variantes} movimientos={movimientos} seleccionInicial={variante} />

      <div className="mt-4 max-w-[920px]">
        <FormularioProducto
          key={p.id}
          tieneAromas={p.variantes.some((v) => v.aroma)}
          inicial={{
            id: p.id,
            nombreBase: p.nombreBase,
            tamano: p.tamano,
            categoria: p.categoria,
            precio: p.precio == null ? "" : p.precio.toFixed(2),
            costo: p.costo == null ? "" : p.costo.toFixed(2),
            descripcion: p.descripcion,
            beneficios: p.beneficios.join("\n"),
            modoUso: p.modoUso.join("\n"),
            seguridad: p.seguridad,
            cotizar: p.cotizar,
            masVendido: p.insignias.includes("mas"),
            nuevo: p.insignias.includes("nuevo"),
            tinte: p.tinte ?? "",
            activo: p.activo,
          }}
        />
      </div>
    </>
  );
}

export default function Pagina({ params, searchParams }: PageProps<"/admin/productos/[slug]">) {
  return (
    <Suspense fallback={<div className="h-96 rounded-md bg-white/60" />}>
      <Producto params={params} searchParams={searchParams} />
    </Suspense>
  );
}
