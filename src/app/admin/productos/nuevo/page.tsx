import { Suspense } from "react";
import { FormularioProducto } from "@/components/admin/formulario-producto";
import { TituloPagina } from "@/components/admin/ui";
import { listarCategoriasAdmin } from "@/lib/datos/admin";

export const metadata = { title: "Nuevo producto" };

async function Nuevo({ searchParams }: { searchParams: PageProps<"/admin/productos/nuevo">["searchParams"] }) {
  const [sp, categorias] = await Promise.all([searchParams, listarCategoriasAdmin()]);
  const texto = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const presentacion = !!texto("linea");
  return (
    <>
      <TituloPagina
        volver={{ href: "/admin/productos", label: "Productos" }}
        titulo={presentacion ? "Nueva presentación" : "Nuevo producto"}
        sub={presentacion ? `Otra presentación de “${texto("base")}”: se muestra como tarjeta aparte en la tienda.` : "Crea el producto y después agrégale sus aromas, foto y stock."}
      />
      <div className="max-w-[920px]">
        <FormularioProducto
          tieneAromas={false}
          categorias={categorias}
          inicial={{
            nombreBase: texto("base"),
            linea: texto("linea") || undefined,
            tamano: "",
            categoria: texto("cat"),
            precio: "",
            costo: "",
            descripcion: "",
            beneficios: "",
            modoUso: "",
            seguridad: false,
            cotizar: false,
            masVendido: false,
            nuevo: true,
            tinte: "",
            activo: true,
          }}
        />
      </div>
    </>
  );
}

export default function Pagina({ searchParams }: PageProps<"/admin/productos/nuevo">) {
  return (
    <Suspense fallback={<div className="h-96 rounded-md bg-white/60" />}>
      <Nuevo searchParams={searchParams} />
    </Suspense>
  );
}
