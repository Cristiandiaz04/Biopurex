import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogoVista } from "@/components/tienda/catalogo-vista";

export const metadata: Metadata = {
  title: "Catálogo",
  description: "Todos los productos BIOPUREX: limpieza del hogar, lavandería, cocina, grado alimenticio, aromatizantes y línea automotriz.",
};

export default function Catalogo() {
  return (
    <Suspense>
      <CatalogoVista />
    </Suspense>
  );
}
