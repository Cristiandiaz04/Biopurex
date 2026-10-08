"use client";

import { useState, useTransition } from "react";
import { guardarConfiguracion, type DatosConfiguracion } from "@/acciones/admin-docs";
import { MensajeError } from "@/components/ui/campo";
import { entradaAdmin } from "./modal";
import { boton } from "./ui";

export function FormularioConfiguracion({ inicial }: { inicial: DatosConfiguracion }) {
  const [d, setD] = useState(inicial);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  const campo = (k: keyof DatosConfiguracion, label: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}, ayuda?: string) => (
    <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
      {label}
      <input
        value={d[k]}
        onChange={(e) => {
          setD((x) => ({ ...x, [k]: e.target.value }));
          setOk(null);
        }}
        className={`${entradaAdmin} ${errores[k] ? "border-error" : ""}`}
        {...extra}
      />
      {errores[k] ? <span className="text-xs font-semibold text-error">{errores[k]}</span> : ayuda && <span className="text-xs font-normal text-text-2">{ayuda}</span>}
    </label>
  );

  const seccion = "flex flex-col gap-3.5 rounded-md bg-white p-4 shadow-[inset_0_0_0_1px_var(--border)]";

  return (
    <div className="flex max-w-[920px] flex-col gap-4">
      <section className={seccion}>
        <div>
          <h2 className="m-0 text-base font-bold">Datos de la empresa</h2>
          <p className="mb-0 mt-1 text-[13px] text-text-2">Salen en las facturas y cotizaciones.</p>
        </div>
        <div className="grid grid-cols-1 gap-3.5 min-[900px]:grid-cols-2">
          {campo("razonSocial", "Razón social", { maxLength: 120 })}
          {campo("rtnEmisor", "RTN", { inputMode: "numeric", placeholder: "14 dígitos" })}
          {campo("direccionEmisor", "Dirección", { maxLength: 200 })}
          {campo("telefonoEmisor", "Teléfono", { maxLength: 20 })}
          {campo("correoEmisor", "Correo", { type: "email", maxLength: 120 })}
        </div>
      </section>
      <section className={seccion}>
        <div>
          <h2 className="m-0 text-base font-bold">Cuenta para transferencias</h2>
          <p className="mb-0 mt-1 text-[13px] text-text-2">La ve el cliente en el checkout y en “Pedido creado”.</p>
        </div>
        <div className="grid grid-cols-1 gap-3.5 min-[900px]:grid-cols-2">
          {campo("banco", "Banco", { maxLength: 60 })}
          {campo("tipoCuenta", "Tipo de cuenta", { maxLength: 60, placeholder: "Cuenta de ahorro en Lempiras" })}
          {campo("numeroCuenta", "Número de cuenta", { maxLength: 40 })}
          {campo("titular", "A nombre de", { maxLength: 120 })}
        </div>
      </section>
      <section className={seccion}>
        <div>
          <h2 className="m-0 text-base font-bold">Costos de envío</h2>
          <p className="mb-0 mt-1 text-[13px] text-text-2">San Pedro Sula aplica cuando el departamento es Cortés y la ciudad es San Pedro Sula.</p>
        </div>
        <div className="grid grid-cols-2 gap-3.5">
          {campo("envioSps", "San Pedro Sula (L.)", { inputMode: "decimal" })}
          {campo("envioResto", "Resto del país (L.)", { inputMode: "decimal" })}
        </div>
      </section>
      {error && <MensajeError>{error}</MensajeError>}
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={pendiente}
          onClick={() =>
            iniciar(async () => {
              setError(null);
              const r = await guardarConfiguracion(d);
              if (r.error) {
                setError(r.error);
                setErrores(r.errores ?? {});
                return;
              }
              setErrores({});
              setOk(r.ok ?? null);
            })
          }
          className={`${boton.primario} h-12`}
        >
          {pendiente ? "Guardando…" : "Guardar configuración"}
        </button>
        {ok && <span role="status" className="text-sm font-semibold text-success">{ok}</span>}
      </div>
    </div>
  );
}
