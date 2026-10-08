export type InsigniaId = "mas" | "nuevo" | "mayoreo" | "agotado";

const ESTILO: Record<InsigniaId, { label: string; className: string }> = {
  mas: { label: "Más vendido", className: "bg-navy text-white shadow-[inset_0_0_0_1.5px_var(--navy)]" },
  nuevo: { label: "Nuevo", className: "bg-bg text-navy shadow-[inset_0_0_0_1.5px_var(--green)]" },
  mayoreo: { label: "Mayoreo", className: "bg-navy-50 text-navy" },
  agotado: { label: "Agotado", className: "bg-surface text-text-2 shadow-[inset_0_0_0_1.5px_var(--border)]" },
};

export function Insignias({ ids, chica }: { ids: InsigniaId[]; chica?: boolean }) {
  if (!ids.length) return null;
  return (
    <div className={`flex flex-col items-start ${chica ? "gap-1" : "gap-1.5"}`}>
      {ids.map((id) => (
        <span
          key={id}
          className={`whitespace-nowrap rounded-full font-semibold leading-none ${
            chica ? "px-[9px] py-1.5 text-[11px]" : "px-[11px] py-[7px] text-xs"
          } ${ESTILO[id].className}`}
        >
          {ESTILO[id].label}
        </span>
      ))}
    </div>
  );
}
