import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { TablaInventario } from "@/components/admin/tabla-inventario";
import { boton, TituloPagina } from "@/components/admin/ui";
import { BotonCategorias } from "@/components/admin/categorias";
import { listarCategoriasAdmin, listarInventario } from "@/lib/datos/admin";

export const metadata = { title: "Productos e inventario" };

async function Inventario() {
  const [productos, categorias] = await Promise.all([listarInventario(), listarCategoriasAdmin()]);
  const variantes = productos.reduce((s, p) => s + p.variantes.length, 0);
  const bajos = productos.reduce((s, p) => s + p.variantes.filter((v) => v.activo && v.stock - v.apartado <= v.minimo).length, 0);
  return (
    <>
      <TituloPagina titulo="Productos e inventario" sub={`${productos.length} productos · ${variantes} variantes · ${bajos} con stock bajo`}>
        <BotonCategorias categorias={categorias} />
        <Link href="/admin/productos/nuevo" className={`${boton.primario} no-underline`}>
          <Plus size={16} strokeWidth={2.25} aria-hidden />
          Nuevo producto
        </Link>
      </TituloPagina>
      <TablaInventario productos={productos} categorias={categorias} />
    </>
  );
}

export default function Pagina() {
  return (
    <Suspense fallback={<div className="h-96 rounded-md bg-white/60" />}>
      <Inventario />
    </Suspense>
  );
}
