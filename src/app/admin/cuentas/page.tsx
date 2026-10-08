import { Suspense } from "react";
import { TablaCuentas, type FilaCuenta } from "@/components/admin/tabla-cuentas";
import { TituloPagina } from "@/components/admin/ui";
import { documentosPendientes, porTramo } from "@/lib/cobros";
import { datosCuentasPorCobrar } from "@/lib/datos/admin";
import { lempiras } from "@/lib/formato";

export const metadata = { title: "Cuentas por cobrar" };

async function Cuentas() {
  const { ahora, clientes } = await datosCuentasPorCobrar();
  const filas: FilaCuenta[] = clientes.map((c) => {
    const t = porTramo(documentosPendientes(c.documentos, c.saldo, ahora));
    // Saldo que no corresponde a un pedido a crédito (p. ej. el cliente cambió de etiqueta): cuenta como 0–30.
    const sinDoc = Math.max(0, Math.round((c.saldo - t["0-30"] - t["31-60"] - t["+60"]) * 100) / 100);
    return { id: c.id, nombre: c.nombre, limite: c.limite, saldo: c.saldo, t0: t["0-30"] + sinDoc, t1: t["31-60"], t2: t["+60"], ultimoAbono: c.ultimoAbono };
  });
  const total = filas.reduce((s, f) => s + f.saldo, 0);
  const tramos = [
    { label: "0–30 días", monto: filas.reduce((s, f) => s + f.t0, 0), color: "bg-navy" },
    { label: "31–60 días", monto: filas.reduce((s, f) => s + f.t1, 0), color: "bg-warning" },
    { label: "Más de 60 días", monto: filas.reduce((s, f) => s + f.t2, 0), color: "bg-error" },
  ];
  const sobre = filas.filter((f) => f.saldo > f.limite).length;

  return (
    <>
      <TituloPagina titulo="Cuentas por cobrar" sub={`${filas.length} clientes con saldo · ${sobre} sobre su límite`} />
      <div className="mb-4 grid grid-cols-2 gap-3 min-[1180px]:grid-cols-4">
        <div className="rounded-md bg-navy p-4 text-white">
          <div className="text-[13px] font-semibold text-on-navy-2">Total por cobrar</div>
          <div className="mt-1.5 text-2xl font-bold tabular-nums">{lempiras(total)}</div>
        </div>
        {tramos.map((t) => (
          <div key={t.label} className="rounded-md bg-white p-4 shadow-[inset_0_0_0_1px_var(--border)]">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-text-2">
              <span className={`size-2.5 rounded-[3px] ${t.color}`} />
              {t.label}
            </div>
            <div className="mt-1.5 text-2xl font-bold tabular-nums">{lempiras(t.monto)}</div>
            <div className="text-xs text-text-2">{total > 0 ? Math.round((t.monto / total) * 100) : 0} % del total</div>
          </div>
        ))}
      </div>
      {total > 0 && (
        <div className="mb-4 flex h-3 gap-0.5 overflow-hidden rounded-md">
          {tramos.map((t) => (
            <span key={t.label} className={t.color} style={{ width: `${(t.monto / total) * 100}%` }} />
          ))}
        </div>
      )}
      <TablaCuentas filas={filas} />
    </>
  );
}

export default function Pagina() {
  return (
    <Suspense fallback={<div className="h-96 rounded-md bg-white/60" />}>
      <Cuentas />
    </Suspense>
  );
}
