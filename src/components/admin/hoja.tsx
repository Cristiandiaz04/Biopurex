/** Hoja imprimible (cotización y factura). Al imprimir se ocultan el menú y la cabecera del panel. */
export function Hoja({ children, anulada }: { children: React.ReactNode; anulada?: boolean }) {
  return (
    <article className="relative mx-auto flex max-w-[880px] flex-col gap-6 overflow-hidden rounded-sm bg-white p-[clamp(20px,5vw,56px)] text-[13px] leading-[1.45] shadow-1 print:max-w-none print:rounded-none print:p-0 print:shadow-none">
      {anulada && (
        <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="font-display -rotate-[24deg] text-[120px] text-error/15">Anulada</span>
        </div>
      )}
      {children}
    </article>
  );
}

export function Emisor({ e }: { e: { razon: string; rtn: string | null; direccion: string; telefono: string; correo: string } }) {
  return (
    <div className="flex flex-col gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/img/logo.png" alt="BIOPUREX" className="h-[54px] w-auto self-start" />
      <div className="text-text-2">
        <strong className="text-[13px] text-navy">{e.razon}</strong>
        {e.rtn && <> · RTN {e.rtn}</>}
        <br />
        {e.direccion}
        <br />
        Tel. {e.telefono} · {e.correo}
      </div>
    </div>
  );
}

export const thDoc = "border-b-2 border-navy px-2 py-2 text-left text-[11px] font-bold uppercase tracking-[.06em]";
export const tdDoc = "border-b border-line px-2 py-2";
