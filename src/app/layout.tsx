import type { Metadata, Viewport } from "next";
import { Anton, Inter } from "next/font/google";
import { CarritoProvider } from "@/components/tienda/carrito-provider";
import { AvisoCarrito, CarritoLateral } from "@/components/tienda/carrito-lateral";
import { Encabezado } from "@/components/tienda/encabezado";
import { Pie } from "@/components/tienda/pie";
import "./globals.css";

const anton = Anton({ variable: "--font-anton", weight: "400", subsets: ["latin"], display: "swap" });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "BIOPUREX — Tu mejor aliado en la limpieza", template: "%s · BIOPUREX" },
  description:
    "Productos de limpieza hondureños de San Pedro Sula. Desinfectantes, detergentes, jabones, aromatizantes y línea automotriz. Compra en línea con envío a todo Honduras.",
};

export const viewport: Viewport = { themeColor: "#1E2A5E" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${anton.variable} ${inter.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <CarritoProvider>
          <Encabezado />
          <div className="flex flex-1 flex-col">{children}</div>
          <Pie />
          <CarritoLateral />
          <AvisoCarrito />
        </CarritoProvider>
      </body>
    </html>
  );
}
