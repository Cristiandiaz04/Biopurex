import Image from "next/image";
import Link from "next/link";

export const metadata = { title: "Página no encontrada", robots: { index: false } };

/** 404 propio (con la marca) en vez de la pantalla genérica en inglés. */
export default function NoEncontrado() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-surface px-6 text-center">
      <Link href="/" aria-label="BIOPUREX, ir al inicio">
        <Image src="/img/logo.png" alt="BIOPUREX" width={120} height={95} className="h-24 w-auto" priority />
      </Link>
      <h1 className="font-display text-h2 m-0">No encontramos esta página</h1>
      <p className="m-0 max-w-[40ch] leading-normal text-text-2">Puede que el enlace esté mal escrito o que el producto ya no esté disponible.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/catalogo" className="inline-flex h-12 items-center rounded-full bg-navy px-6 font-semibold text-white no-underline">
          Ir a la tienda
        </Link>
        <Link href="/" className="inline-flex h-12 items-center rounded-full px-6 font-semibold text-navy no-underline shadow-[inset_0_0_0_1.5px_var(--border)]">
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
