import type { Metadata, Viewport } from "next";
import { Anton, Inter } from "next/font/google";
import { CarritoProvider } from "@/components/tienda/carrito-provider";
import { AvisoCarrito, CarritoLateral } from "@/components/tienda/carrito-lateral";
import { CatalogoProvider } from "@/components/tienda/catalogo-provider";
import { Encabezado } from "@/components/tienda/encabezado";
import { Pie } from "@/components/tienda/pie";
import { obtenerConfiguracion, obtenerProductos } from "@/lib/datos/catalogo";
import "./globals.css";

const anton = Anton({ variable: "--font-anton", weight: "400", subsets: ["latin"], display: "swap" });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "BIOPUREX — Tu mejor aliado en la limpieza", template: "%s · BIOPUREX" },
  description:
    "Productos de limpieza hondureños de San Pedro Sula. Desinfectantes, detergentes, jabones, aromatizantes y línea automotriz. Compra en línea con envío a todo Honduras.",
};

export const viewport: Viewport = { themeColor: "#1E2A5E" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [productos, conf] = await Promise.all([obtenerProductos(), obtenerConfiguracion()]);
  return (
    <html lang="es" className={`${anton.variable} ${inter.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <CatalogoProvider productos={productos} envio={{ sps: conf.envioSps, resto: conf.envioResto }}>
          <CarritoProvider>
            <Encabezado />
            <div className="flex flex-1 flex-col">{children}</div>
            <Pie />
            <CarritoLateral />
            <AvisoCarrito />
          </CarritoProvider>
        </CatalogoProvider>
      </body>
    </html>
  );
}
