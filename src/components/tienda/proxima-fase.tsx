import Link from "next/link";
import { Clock } from "lucide-react";

/** Pantalla temporal para rutas que dependen de Supabase (fase 2). */
export function ProximaFase({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <main className="flex min-h-[70vh] justify-center bg-surface px-4 py-[clamp(32px,6vw,72px)]">
      <div className="flex w-full max-w-[440px] flex-col items-center gap-4 self-start rounded-xl bg-bg p-[clamp(24px,4vw,40px)] text-center shadow-2">
        <span className="flex size-[72px] items-center justify-center rounded-full bg-navy-50">
          <Clock size={28} strokeWidth={1.75} aria-hidden />
        </span>
        <h1 className="font-display m-0 text-[clamp(28px,3vw,34px)] leading-none">{titulo}</h1>
        <p className="m-0 leading-normal text-text-2">{texto}</p>
        <Link href="/catalogo" className="mt-2 flex h-[52px] items-center rounded-full bg-navy px-7 font-semibold text-white no-underline hover:bg-navy-700">
          Seguir viendo productos
        </Link>
      </div>
    </main>
  );
}
