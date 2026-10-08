"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { BarChart3, Box, Building2, Factory, FileText, FlaskConical, LayoutDashboard, LogOut, Menu, PanelLeft, Receipt, Settings, ShoppingBag, Store, Tag, Truck, Users, Wallet, X } from "lucide-react";
import { cerrarSesion } from "@/acciones/acceso";

const NAV = [
  { href: "/admin", label: "Dashboard", icono: LayoutDashboard },
  { href: "/admin/pedidos", label: "Pedidos", icono: ShoppingBag, insignia: true },
  { href: "/admin/clientes", label: "Clientes", icono: Users },
  { href: "/admin/productos", label: "Productos e inventario", icono: Box },
  { href: "/admin/materia-prima", label: "Materia prima", icono: FlaskConical },
  { href: "/admin/produccion", label: "Producción", icono: Factory },
  { href: "/admin/compras", label: "Compras", icono: Truck },
  { href: "/admin/proveedores", label: "Proveedores", icono: Building2 },
  { href: "/admin/cotizaciones", label: "Cotizaciones", icono: FileText },
  { href: "/admin/facturas", label: "Facturas", icono: Receipt },
  { href: "/admin/cuentas", label: "Cuentas por cobrar", icono: Wallet },
  { href: "/admin/descuentos", label: "Descuentos", icono: Tag },
  { href: "/admin/reportes", label: "Reportes", icono: BarChart3 },
  { href: "/admin/configuracion", label: "Configuración", icono: Settings },
];

// Preferencia "menú plegado" (por navegador).
const oyentes = new Set<() => void>();
const suscribirPlegado = (o: () => void) => {
  oyentes.add(o);
  return () => oyentes.delete(o);
};
const leerPlegado = () => {
  try {
    return localStorage.getItem("bpx-admin-plegado") === "1";
  } catch {
    return false;
  }
};

const iniciales = (nombre: string) =>
  nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "A";

export function MarcoAdmin({ nombre, pendientes, children }: { nombre: string; pendientes: number; children: React.ReactNode }) {
  const pathname = usePathname();
  const plegado = useSyncExternalStore(suscribirPlegado, leerPlegado, () => false);
  const [abierto, setAbierto] = useState(false);

  const activo = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
  const titulo = NAV.find((n) => activo(n.href))?.label ?? "Panel";

  const alternar = () => {
    try {
      localStorage.setItem("bpx-admin-plegado", plegado ? "0" : "1");
    } catch {}
    oyentes.forEach((o) => o());
  };

  // Etiquetas visibles: escritorio sin plegar, o menú móvil abierto. En tablet (900–1179) siempre íconos.
  const menu = (movil: boolean) => {
    const etiquetas = movil || !plegado;
    return (
      <>
        <div className="flex h-[72px] flex-none items-center gap-2.5 px-3.5">
          <span className={`items-center rounded-sm bg-white px-3 ${etiquetas ? "flex h-11" : "hidden"} ${movil ? "" : "min-[1180px]:flex max-[1179px]:hidden"}`}>
            <Image src="/img/logo.png" alt="BIOPUREX" width={60} height={30} className="h-[30px] w-auto" />
          </span>
          {etiquetas && <span className={`text-[11px] font-bold uppercase tracking-[.12em] text-on-navy-2 ${movil ? "" : "max-[1179px]:hidden"}`}>Admin</span>}
          <span
            title="BIOPUREX Admin"
            className={`font-display h-11 w-12 items-center justify-center rounded-sm bg-white text-2xl text-navy ${movil ? "hidden" : etiquetas ? "hidden max-[1179px]:flex" : "flex"}`}
          >
            B
          </span>
          {movil && (
            <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar menú" className="ml-auto flex size-11 items-center justify-center rounded-full hover:bg-white/10">
              <X size={20} aria-hidden />
            </button>
          )}
        </div>
        <nav aria-label="Menú principal" className="no-scrollbar flex flex-1 flex-col gap-0.5 overflow-y-auto px-3.5 py-2">
          {NAV.map(({ href, label, icono: Icono, insignia }) => {
            const act = activo(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setAbierto(false)}
                title={label}
                aria-current={act ? "page" : undefined}
                className={`relative flex h-11 min-w-12 flex-none items-center gap-3 whitespace-nowrap rounded-sm px-3.5 text-sm font-semibold no-underline transition-colors hover:bg-white/10 hover:text-white ${
                  act ? "bg-white/[.14] text-white" : "text-on-navy-2"
                }`}
              >
                <span className="absolute -left-3.5 bottom-2.5 top-2.5 w-[3px] rounded-r-[3px] bg-green" style={{ opacity: act ? 1 : 0 }} />
                <Icono size={20} className="flex-none" aria-hidden />
                <span className={`flex-1 truncate ${etiquetas ? "" : "hidden"} ${movil ? "" : "max-[1179px]:hidden"}`}>{label}</span>
                {insignia && pendientes > 0 && (
                  <span
                    className={`flex h-5 min-w-5 items-center justify-center rounded-full bg-green px-1.5 text-[11px] font-bold text-navy ${
                      // Con etiquetas va al final de la fila; en modo íconos, sobre la esquina del ícono.
                      etiquetas ? "" : "absolute right-1 top-0.5"
                    } ${movil ? "" : "max-[1179px]:absolute max-[1179px]:right-1 max-[1179px]:top-0.5"}`}
                  >
                    {pendientes}
                  </span>
                )}
              </Link>
            );
          })}
          <Link href="/" title="Ver tienda" className="mt-2 flex h-11 min-w-12 flex-none items-center gap-3 whitespace-nowrap rounded-sm px-3.5 text-sm font-semibold text-on-navy-2 no-underline hover:bg-white/10 hover:text-white">
            <Store size={20} className="flex-none" aria-hidden />
            <span className={`${etiquetas ? "" : "hidden"} ${movil ? "" : "max-[1179px]:hidden"}`}>Ver tienda</span>
          </Link>
        </nav>
        <div className="flex flex-none flex-col gap-2 border-t border-white/[.12] px-3.5 pb-4 pt-3">
          {!movil && (
            <button
              type="button"
              onClick={alternar}
              title={plegado ? "Expandir menú" : "Plegar menú"}
              className="flex h-10 items-center gap-3 whitespace-nowrap rounded-sm px-3.5 text-[13px] font-semibold text-on-navy-2 hover:bg-white/10 max-[1179px]:hidden"
            >
              <PanelLeft size={20} aria-hidden />
              {!plegado && "Plegar menú"}
            </button>
          )}
          <div className="flex items-center gap-2.5 whitespace-nowrap px-1.5 py-1">
            <span className="flex size-9 flex-none items-center justify-center rounded-full bg-green text-[13px] font-bold text-navy">{iniciales(nombre)}</span>
            {etiquetas && (
              <span className={`flex min-w-0 flex-col ${movil ? "" : "max-[1179px]:hidden"}`}>
                <span className="truncate text-[13px] font-semibold">{nombre || "Administrador"}</span>
                <span className="text-xs text-on-navy-2">Administrador</span>
              </span>
            )}
          </div>
          <form action={cerrarSesion}>
            <button type="submit" title="Cerrar sesión" className="flex h-10 w-full items-center gap-3 whitespace-nowrap rounded-sm px-3.5 text-[13px] font-semibold text-on-navy-2 hover:bg-white/10">
              <LogOut size={20} aria-hidden />
              <span className={`${etiquetas ? "" : "hidden"} ${movil ? "" : "max-[1179px]:hidden"}`}>Cerrar sesión</span>
            </button>
          </form>
        </div>
      </>
    );
  };

  return (
    <div className="flex h-dvh bg-surface print:block print:h-auto">
      <aside
        className={`hidden flex-none flex-col overflow-hidden bg-navy text-white transition-[width] duration-200 print:hidden min-[900px]:flex max-[1179px]:w-[76px] ${plegado ? "w-[76px]" : "w-[248px]"}`}
      >
        {menu(false)}
      </aside>

      {/* Menú móvil */}
      <div
        onClick={() => setAbierto(false)}
        aria-hidden
        className="fixed inset-0 z-[70] bg-[var(--scrim)] transition-opacity min-[900px]:hidden"
        style={{ opacity: abierto ? 1 : 0, pointerEvents: abierto ? "auto" : "none" }}
      />
      <aside
        aria-label="Menú"
        className="fixed inset-y-0 left-0 z-[71] flex w-[min(280px,85vw)] flex-col bg-navy text-white transition-[transform,visibility] duration-300 min-[900px]:hidden"
        style={{ transform: abierto ? "none" : "translateX(-105%)", visibility: abierto ? "visible" : "hidden" }}
      >
        {menu(true)}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col print:block">
        <header className="flex h-16 flex-none items-center gap-3 border-b border-line bg-white px-[clamp(16px,3vw,32px)] print:hidden">
          <button type="button" onClick={() => setAbierto(true)} aria-label="Abrir menú" className="-ml-2.5 flex size-11 items-center justify-center rounded-full hover:bg-surface min-[900px]:hidden">
            <Menu size={20} aria-hidden />
          </button>
          <div className="min-w-0 flex-1 truncate text-[15px] font-bold">{titulo}</div>
          <Link href="/" className="flex h-10 items-center gap-2 whitespace-nowrap rounded-full px-3.5 text-sm font-semibold text-navy no-underline shadow-[inset_0_0_0_1.5px_var(--border)] hover:bg-navy-50">
            <Store size={16} aria-hidden />
            <span className="max-[599px]:hidden">Ver tienda</span>
          </Link>
          <span className="whitespace-nowrap text-[13px] text-text-2 max-[1179px]:hidden">
            {new Date().toLocaleDateString("es-HN", { weekday: "long", day: "numeric", month: "short", year: "numeric", timeZone: "America/Tegucigalpa" })}
          </span>
        </header>
        <div className="flex-1 overflow-y-auto overflow-x-hidden print:overflow-visible">
          <div className="mx-auto max-w-[1440px] px-[clamp(16px,3vw,32px)] pb-[72px] pt-[clamp(16px,2.5vw,28px)]">{children}</div>
        </div>
      </div>
    </div>
  );
}
