import type { Metadata, Viewport } from "next";
import { Anton, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
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
        {children}
        {/* Monitoreo de Vercel (visitas y velocidad real en los celulares de los clientes); ~2 KB. */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
