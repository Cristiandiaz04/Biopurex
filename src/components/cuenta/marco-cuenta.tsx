import Link from "next/link";
import { KeyRound, LogOut, MapPin, Package, User } from "lucide-react";
import { cerrarSesion } from "@/acciones/acceso";
import type { Perfil } from "@/lib/datos/cuenta";

const MENU = [
  { href: "/pedidos", label: "Mis pedidos", icono: Package },
  { href: "/cuenta", label: "Direcciones", icono: MapPin },
  { href: "/cuenta/datos", label: "Datos personales", icono: User },
  { href: "/cuenta/contrasena", label: "Contraseña", icono: KeyRound },
];

/** Layout de "Mi cuenta": menú a la izquierda (arriba en móvil) + sección. */
export function MarcoCuenta({ perfil, activo, children }: { perfil: Perfil; activo: string; children: React.ReactNode }) {
  return (
    <main className="min-h-[70vh] bg-surface">
      <div className="mx-auto max-w-[1200px] px-[clamp(16px,3vw,40px)] pb-[clamp(48px,6vw,80px)] pt-6">
        <h1 className="font-display text-h2 mb-1 mt-2">Mi cuenta</h1>
        <p className="mb-6 mt-0 text-text-2">
          Hola{perfil.nombre ? `, ${perfil.nombre.split(" ")[0]}` : ""} · {perfil.correo}
        </p>
        <div className="grid grid-cols-1 items-start gap-5 min-[900px]:grid-cols-[240px_minmax(0,1fr)]">
          <nav aria-label="Mi cuenta" className="flex flex-col gap-0.5 rounded-lg bg-bg p-2 shadow-1">
            {MENU.map(({ href, label, icono: Icono }) => (
              <Link
                key={href}
                href={href}
                aria-current={activo === href ? "page" : undefined}
                className={`flex h-12 items-center gap-3 rounded-md px-3.5 text-[15px] no-underline hover:bg-surface ${
                  activo === href ? "bg-navy-50 font-bold" : "font-medium"
                }`}
              >
                <Icono size={20} aria-hidden />
                {label}
              </Link>
            ))}
            <form action={cerrarSesion}>
              <button type="submit" className="flex h-12 w-full items-center gap-3 rounded-md px-3.5 text-[15px] text-error hover:bg-error-50">
                <LogOut size={20} aria-hidden />
                Cerrar sesión
              </button>
            </form>
          </nav>
          <section>{children}</section>
        </div>
      </div>
    </main>
  );
}
