"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MapPin, Plus } from "lucide-react";
import { eliminarDireccion, guardarDireccion } from "@/acciones/cuenta";
import { Campo, MensajeError } from "@/components/ui/campo";
import { SelectorZona, zonaDeDireccion, zonaInicial } from "@/components/ui/selector-zona";
import type { Direccion } from "@/lib/datos/cuenta";
import type { Municipio } from "@/lib/envio";
import { lugar } from "@/lib/formato";
import { formatoTelefono } from "@/lib/validacion";

type Form = {
  id?: string;
  etiqueta: string;
  nombre: string;
  telefono: string;
  departamento: string;
  municipio: string;
  ciudad: string;
  colonia: string;
  direccion: string;
  referencia: string;
  predeterminada: boolean;
};

const vacio = (nombre: string, municipios: Municipio[]): Form => ({
  etiqueta: "Casa",
  nombre,
  telefono: "",
  ...zonaInicial(municipios),
  colonia: "",
  direccion: "",
  referencia: "",
  predeterminada: false,
});

export function Direcciones({ direcciones, nombre, municipios }: { direcciones: Direccion[]; nombre: string; municipios: Municipio[] }) {
  const router = useRouter();
  const [form, setForm] = useState<Form | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  const set = (k: keyof Form, v: string | boolean) => setForm((f) => (f ? { ...f, [k]: v } : f));

  function editar(d: Direccion) {
    setErrores({});
    setError(null);
    const z = zonaDeDireccion(municipios, { departamento: d.departamento, municipio: d.municipio ?? "", ciudad: d.ciudad });
    setForm({ ...d, departamento: z.departamento, municipio: z.municipio, ciudad: z.ciudad, telefono: formatoTelefono(d.telefono), referencia: d.referencia ?? "" });
  }

  function guardar() {
    if (!form) return;
    iniciar(async () => {
      const { id, etiqueta, predeterminada, ...datos } = form;
      const r = await guardarDireccion({ id, etiqueta, predeterminada, datos });
      if (r.ok) {
        setForm(null);
        router.refresh();
      } else {
        setError(r.error ?? null);
        setErrores(r.errores ?? {});
      }
    });
  }

  function eliminar(id: string) {
    if (!window.confirm("¿Eliminar esta dirección?")) return;
    iniciar(async () => {
      await eliminarDireccion(id);
      router.refresh();
    });
  }

  const campo = (k: keyof Form, label: string, extra: Partial<React.ComponentProps<typeof Campo>> = {}) => (
    <Campo label={label} name={k} value={String(form![k])} onChange={(e) => set(k, e.target.value)} error={errores[k]} {...extra} />
  );

  return (
    <div>
      <h2 className="mb-4 mt-0 text-xl font-bold">Direcciones guardadas</h2>
      {form ? (
        <div className="flex flex-col gap-4 rounded-lg bg-bg p-[clamp(18px,3vw,28px)] shadow-1">
          <h3 className="m-0 text-[17px] font-bold">{form.id ? "Editar dirección" : "Nueva dirección"}</h3>
          <div className="grid grid-cols-1 gap-4 min-[900px]:grid-cols-2">
            {campo("etiqueta", "Nombre de la dirección", { placeholder: "Casa, Oficina, Mamá…" })}
            {campo("nombre", "Quién recibe", { autoComplete: "name" })}
            {campo("telefono", "Teléfono", { type: "tel", inputMode: "numeric", placeholder: "9876-5432" })}
            <SelectorZona
              municipios={municipios}
              valor={{ departamento: form.departamento, municipio: form.municipio, ciudad: form.ciudad }}
              onChange={(z) => setForm((f) => (f ? { ...f, ...z } : f))}
              errores={errores}
            />
            {campo("colonia", "Colonia o barrio")}
            {campo("direccion", "Dirección", { className: "min-[900px]:col-span-2" })}
            {campo("referencia", "Punto de referencia", { opcional: true, className: "min-[900px]:col-span-2" })}
          </div>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
            <input type="checkbox" checked={form.predeterminada} onChange={(e) => set("predeterminada", e.target.checked)} className="size-5 accent-[var(--navy)]" />
            Usar como dirección predeterminada
          </label>
          {error && <MensajeError>{error}</MensajeError>}
          <div className="flex flex-wrap gap-2.5">
            <button type="button" onClick={guardar} disabled={pendiente} className="h-12 rounded-full bg-navy px-6 font-semibold text-white disabled:opacity-60">
              {pendiente ? "Guardando…" : "Guardar dirección"}
            </button>
            <button type="button" onClick={() => setForm(null)} className="h-12 rounded-full px-5 font-semibold shadow-[inset_0_0_0_1.5px_var(--navy)]">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
          {direcciones.map((d) => (
            <div key={d.id} className="flex flex-col gap-2.5 rounded-lg bg-bg p-5 shadow-1">
              <div className="flex items-center gap-2">
                <MapPin size={16} aria-hidden />
                <strong>{d.etiqueta}</strong>
                {d.predeterminada && <span className="ml-auto rounded-full bg-navy-50 px-[9px] py-1 text-[11px] font-semibold">Predeterminada</span>}
              </div>
              <div className="text-sm leading-[1.55] text-text-2">
                <span className="font-semibold text-navy">{d.nombre}</span>
                <br />
                {d.direccion}, {d.colonia}
                <br />
                {lugar(d.ciudad, d.municipio, d.departamento)}
                <br />
                Tel. {formatoTelefono(d.telefono)}
              </div>
              <div className="mt-auto flex gap-1">
                <button type="button" onClick={() => editar(d)} className="h-11 rounded-full px-3 text-sm font-semibold hover:bg-surface">
                  Editar
                </button>
                <button type="button" onClick={() => eliminar(d.id)} disabled={pendiente} className="h-11 rounded-full px-3 text-sm font-semibold text-text-2 hover:bg-surface">
                  Eliminar
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              setErrores({});
              setError(null);
              setForm({ ...vacio(nombre, municipios), predeterminada: direcciones.length === 0 });
            }}
            className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-line font-semibold hover:border-navy hover:bg-bg"
          >
            <span className="flex size-11 items-center justify-center rounded-full bg-bg shadow-1">
              <Plus size={20} aria-hidden />
            </span>
            Agregar dirección
          </button>
        </div>
      )}
    </div>
  );
}
