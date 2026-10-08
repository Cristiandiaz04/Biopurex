import { Suspense } from "react";
import { ExternalLink } from "lucide-react";
import { EditorInicio } from "@/components/admin/editor-inicio";
import { boton, TituloPagina } from "@/components/admin/ui";
import { listarCategoriasAdmin } from "@/lib/datos/admin";
import { listarSeccionesInicio, opcionesVariantes } from "@/lib/datos/admin-docs";

export const metadata = { title: "Página de inicio" };

async function Inicio() {
  const [secciones, opciones, categorias] = await Promise.all([listarSeccionesInicio(), opcionesVariantes(), listarCategoriasAdmin()]);
  return (
    <>
      <TituloPagina titulo="Página de inicio" sub="Lo que se ve en el inicio después de «Cómo trabajamos»: bloques y filas de productos, en este orden.">
        <a href="/" target="_blank" rel="noopener noreferrer" className={`${boton.secundario} no-underline`}>
          <ExternalLink size={16} aria-hidden />
          Ver el inicio
        </a>
      </TituloPagina>
      <div className="max-w-[920px]">
        <EditorInicio secciones={secciones} opciones={opciones} categorias={categorias.filter((c) => c.activo)} />
      </div>
    </>
  );
}

export default function Pagina() {
  return (
    <Suspense fallback={<div className="h-96 rounded-md bg-white/60" />}>
      <Inicio />
    </Suspense>
  );
}
