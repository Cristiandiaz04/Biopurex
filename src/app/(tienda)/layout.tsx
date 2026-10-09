import { CarritoProvider } from "@/components/tienda/carrito-provider";
import { AvisoCarrito, CarritoLateral } from "@/components/tienda/carrito-lateral";
import { CatalogoProvider } from "@/components/tienda/catalogo-provider";
import { Encabezado } from "@/components/tienda/encabezado";
import { Pie } from "@/components/tienda/pie";
import { obtenerCategorias, obtenerProductos, obtenerZonas } from "@/lib/datos/catalogo";

/** Tienda pública: encabezado, pie, carrito y el catálogo (cacheado) para los componentes de cliente. */
export default async function LayoutTienda({ children }: { children: React.ReactNode }) {
  const [productos, categorias, zonas] = await Promise.all([obtenerProductos(), obtenerCategorias(), obtenerZonas()]);
  // Al navegador va el catálogo sin descripciones, beneficios, modo de uso ni notas: el carrito,
  // las tarjetas y el buscador no los usan, y la ficha del producto los recibe del servidor.
  // (~70 KB menos en cada página.)
  const liviano = productos.map((p) => ({ ...p, desc: "", beneficios: [], modoUso: [], notas: {} }));
  const costos = zonas.municipios.map((m) => m.costo);
  const envio = {
    desde: costos.length ? Math.min(...costos) : null,
    gratisDesde: zonas.gratisDesde,
    zonas: [...new Set(zonas.municipios.map((m) => m.nombre))],
  };
  return (
    <CatalogoProvider productos={liviano} categorias={categorias} envio={envio}>
      <CarritoProvider>
        <Encabezado />
        <div className="flex flex-1 flex-col">{children}</div>
        <Pie categorias={categorias} />
        <CarritoLateral />
        <AvisoCarrito />
      </CarritoProvider>
    </CatalogoProvider>
  );
}
