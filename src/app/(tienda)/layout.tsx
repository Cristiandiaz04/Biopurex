import { CarritoProvider } from "@/components/tienda/carrito-provider";
import { AvisoCarrito, CarritoLateral } from "@/components/tienda/carrito-lateral";
import { CatalogoProvider } from "@/components/tienda/catalogo-provider";
import { Encabezado } from "@/components/tienda/encabezado";
import { Pie } from "@/components/tienda/pie";
import { obtenerConfiguracion, obtenerProductos } from "@/lib/datos/catalogo";

/** Tienda pública: encabezado, pie, carrito y el catálogo (cacheado) para los componentes de cliente. */
export default async function LayoutTienda({ children }: { children: React.ReactNode }) {
  const [productos, conf] = await Promise.all([obtenerProductos(), obtenerConfiguracion()]);
  return (
    <CatalogoProvider productos={productos} envio={{ sps: conf.envioSps, resto: conf.envioResto }}>
      <CarritoProvider>
        <Encabezado />
        <div className="flex flex-1 flex-col">{children}</div>
        <Pie />
        <CarritoLateral />
        <AvisoCarrito />
      </CarritoProvider>
    </CatalogoProvider>
  );
}
