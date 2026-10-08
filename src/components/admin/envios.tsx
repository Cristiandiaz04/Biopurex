"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MapPin, Pencil, Plus, Trash2, Truck } from "lucide-react";
import { eliminarMunicipio, guardarEnvioGratis, guardarMunicipio, type DatosMunicipio } from "@/acciones/envios";
import { MensajeError } from "@/components/ui/campo";
import type { Municipio } from "@/lib/envio";
import { lempiras } from "@/lib/formato";
import { DEPARTAMENTOS } from "@/lib/validacion";
import { entradaAdmin, Modal } from "./modal";
import { boton, Chip, Tarjeta } from "./ui";

export function EnvioGratis({ desde }: { desde: number | null }) {
  const router = useRouter();
  const [valor, setValor] = useState(desde == null ? "" : desde.toFixed(2));
  const [msg, setMsg] = useState<{ ok?: string; error?: string }>({});
  const [pendiente, iniciar] = useTransition();
  return (
    <Tarjeta className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <Truck size={18} aria-hidden />
        <h2 className="m-0 text-base font-bold">Envío gratis</h2>
      </div>
      <p className="m-0 text-sm leading-normal text-text-2">
        Si la compra (subtotal de productos) es <strong className="text-navy">mayor</strong> a este monto, el envío no se cobra. Déjalo vacío para cobrar siempre.
      </p>
      <div className="flex flex-wrap items-end gap-2.5">
        <label className="flex w-48 flex-col gap-1.5 text-[13px] font-semibold">
          Compras de más de (L.)
          <input value={valor} onChange={(e) => { setValor(e.target.value); setMsg({}); }} inputMode="decimal" placeholder="Sin envío gratis" className={`${entradaAdmin} text-right tabular-nums`} />
        </label>
        <button
          type="button"
          disabled={pendiente}
          onClick={() =>
            iniciar(async () => {
              const r = await guardarEnvioGratis(valor);
              setMsg(r);
              if (r.ok) router.refresh();
            })
          }
          className={boton.primario}
        >
          {pendiente ? "Guardando…" : "Guardar"}
        </button>
        {msg.ok && <span role="status" className="text-sm font-semibold text-success">{msg.ok}</span>}
      </div>
      {msg.error && <MensajeError>{msg.error}</MensajeError>}
    </Tarjeta>
  );
}

export function BotonMunicipio({ municipio }: { municipio?: Municipio }) {
  const router = useRouter();
  const [form, setForm] = useState<DatosMunicipio | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();
  const set = <K extends keyof DatosMunicipio>(k: K, v: DatosMunicipio[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const err = (k: string) => errores[k] && <span className="text-xs font-semibold text-error">{errores[k]}</span>;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setErrores({});
          setError(null);
          setForm(
            municipio
              ? { id: municipio.id, departamento: municipio.departamento, nombre: municipio.nombre, costo: municipio.costo.toFixed(2), activo: municipio.activo }
              : { departamento: "Cortés", nombre: "", costo: "", activo: true },
          );
        }}
        className={municipio ? boton.secundario : boton.primario}
      >
        {municipio ? <Pencil size={16} aria-hidden /> : <Plus size={16} strokeWidth={2.25} aria-hidden />}
        {municipio ? "Editar" : "Nuevo municipio"}
      </button>
      {form && (
        <Modal titulo={form.id ? "Editar municipio" : "Nuevo municipio"} sub="El cliente lo elige de la lista y escribe su ciudad, aldea o caserío." cerrar={() => setForm(null)}>
          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2 flex flex-col gap-1.5 text-[13px] font-semibold">
              Departamento
              <select value={form.departamento} onChange={(e) => set("departamento", e.target.value)} className={`${entradaAdmin} cursor-pointer`}>
                {DEPARTAMENTOS.map((d) => <option key={d}>{d}</option>)}
              </select>
              {err("departamento")}
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
              Municipio
              <input value={form.nombre} onChange={(e) => set("nombre", e.target.value)} maxLength={80} placeholder="Choloma" className={entradaAdmin} />
              {err("nombre")}
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
              Costo de envío (L.)
              <input value={form.costo} onChange={(e) => set("costo", e.target.value)} inputMode="decimal" placeholder="60.00" className={`${entradaAdmin} text-right tabular-nums`} />
              {err("costo")}
            </label>
          </div>
          <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm">
            <input type="checkbox" checked={form.activo} onChange={(e) => set("activo", e.target.checked)} className="size-5 accent-[var(--navy)]" />
            Activo (los clientes lo pueden elegir)
          </label>
          {error && <MensajeError>{error}</MensajeError>}
          <div className="flex justify-end gap-2.5">
            <button type="button" onClick={() => setForm(null)} className={boton.secundario}>Cancelar</button>
            <button
              type="button"
              disabled={pendiente}
              onClick={() =>
                iniciar(async () => {
                  const r = await guardarMunicipio(form);
                  if (r.error) {
                    setError(r.error);
                    setErrores(r.errores ?? {});
                    return;
                  }
                  setForm(null);
                  router.refresh();
                })
              }
              className={boton.primario}
            >
              {pendiente ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

export function TarjetaMunicipio({ municipio: m }: { municipio: Municipio }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  return (
    <Tarjeta className={`flex flex-col overflow-hidden ${m.activo ? "" : "opacity-75"}`}>
      <div className="flex flex-wrap items-start gap-3 px-4 py-3.5">
        <span className="flex size-10 flex-none items-center justify-center rounded-full bg-navy-50">
          <MapPin size={18} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="text-[15px]">{m.nombre}</strong>
            {m.activo ? <Chip chico className="bg-success-50 text-success">Activo</Chip> : <Chip chico className="bg-surface text-text-2">Desactivado</Chip>}
          </div>
          <div className="text-[13px] text-text-2">
            {m.departamento} · envío <strong className="text-navy">{lempiras(m.costo)}</strong>
          </div>
        </div>
        <div className="flex gap-1.5">
          <BotonMunicipio municipio={m} />
          <button
            type="button"
            aria-label={`Eliminar ${m.nombre}`}
            title="Eliminar municipio"
            disabled={pendiente}
            onClick={() => {
              if (!window.confirm(`¿Eliminar ${m.nombre}? Los pedidos anteriores no cambian.`)) return;
              iniciar(async () => {
                setError(null);
                const r = await eliminarMunicipio(m.id);
                if (r.error) return setError(r.error);
                router.refresh();
              });
            }}
            className="flex size-11 items-center justify-center rounded-sm text-text-2 hover:bg-error-50 hover:text-error"
          >
            <Trash2 size={16} aria-hidden />
          </button>
        </div>
      </div>
      {error && <div className="px-4 pb-3"><MensajeError>{error}</MensajeError></div>}
    </Tarjeta>
  );
}
