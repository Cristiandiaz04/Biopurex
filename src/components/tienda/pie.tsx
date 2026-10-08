import Image from "next/image";
import Link from "next/link";
import { AtSign, Mail, MapPin, Phone } from "lucide-react";
import { categoria, type CategoriaId } from "@/lib/catalogo";

const NAV: CategoriaId[] = ["hogar", "lavanderia", "cocina", "auto", "articulos"];
const titulo = "mb-1.5 text-xs font-bold uppercase tracking-[.08em] text-text-2";
const enlace = "flex min-h-10 items-center gap-2.5 text-sm no-underline hover:underline";

export function Pie() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-[1280px] grid-cols-2 gap-x-6 gap-y-8 px-[clamp(16px,3vw,40px)] pb-6 pt-[clamp(40px,5vw,64px)] min-[900px]:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))]">
        <div className="col-span-full flex flex-col items-start gap-3 min-[900px]:col-span-1">
          <Image src="/img/logo.png" alt="BIOPUREX" width={104} height={52} className="h-[52px] w-auto" />
          <p className="m-0 max-w-[34ch] text-sm leading-[1.55] text-text-2">
            Productos de limpieza hechos en San Pedro Sula. Venta solo en línea, con envío a todo Honduras.
          </p>
        </div>
        <div className="flex flex-col">
          <div className={titulo}>Tienda</div>
          {NAV.map((id) => (
            <Link key={id} href={`/catalogo?cat=${id}`} className={enlace}>
              {categoria(id).corto}
            </Link>
          ))}
        </div>
        <div className="flex flex-col">
          <div className={titulo}>Mi cuenta</div>
          <Link href="/pedidos" className={enlace}>Mis pedidos</Link>
          <Link href="/cuenta" className={enlace}>Mi cuenta</Link>
        </div>
        <div className="flex flex-col">
          <div className={titulo}>Contacto</div>
          <a href="tel:+50489361277" className={enlace}>
            <Phone size={16} strokeWidth={2.25} aria-hidden />
            8936-1277
          </a>
          <a href="https://instagram.com/biopurex_" target="_blank" rel="noopener noreferrer" className={enlace}>
            <AtSign size={16} strokeWidth={2.25} aria-hidden />
            @biopurex_
          </a>
          <a href="mailto:mibiopurex@gmail.com" className={`${enlace} break-all`}>
            <Mail size={16} strokeWidth={2.25} aria-hidden className="flex-none" />
            mibiopurex@gmail.com
          </a>
          <span className={enlace}>
            <MapPin size={16} strokeWidth={2.25} aria-hidden />
            San Pedro Sula, Cortés
          </span>
        </div>
      </div>
      <div className="mx-auto flex max-w-[1280px] flex-wrap justify-between gap-2 border-t border-line px-[clamp(16px,3vw,40px)] pb-7 pt-4 text-xs text-text-2">
        <span>© 2026 BIOPUREX · Tu mejor aliado en la limpieza</span>
        <span>Precios mostrados son de ejemplo</span>
      </div>
    </footer>
  );
}
