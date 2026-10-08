/** Estado de carga de página (esqueleto neutro, sin animaciones caras). */
export function Cargando({ texto = "Cargando…" }: { texto?: string }) {
  return (
    <main className="flex min-h-[70vh] items-start justify-center bg-surface px-4 py-16" aria-busy="true">
      <div className="flex w-full max-w-[720px] flex-col gap-4">
        <div className="h-10 w-1/2 rounded-md bg-line/70" />
        <div className="h-40 rounded-lg bg-bg shadow-1" />
        <div className="h-40 rounded-lg bg-bg shadow-1" />
        <span className="sr-only">{texto}</span>
      </div>
    </main>
  );
}
