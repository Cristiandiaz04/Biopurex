"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, Pencil, Plus, Search, SlidersHorizontal } from "lucide-react";
import { ajustarMateria, guardarMateria, type DatosMateria } from "@/acciones/produccion";
import { MensajeError } from "@/components/ui/campo";
import { lempiras } from "@/lib/formato";
import { cantidad, UNIDADES } from "@/lib/unidades";
import type { MateriaPrima } from "@/lib/datos/produccion";
import { entradaAdmin, Modal } from "./modal";
import { boton, Chip, td, th, Vacio } from "./ui";

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function BotonMateria({ materia }: { materia?: MateriaPrima }) {
  const router = useRouter();
  const [form, setForm] = useState<DatosMateria | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();
  const set = <K extends keyof DatosMateria>(k: K, v: DatosMateria[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const err = (k: string) => errores[k] && <span className="text-xs font-semibold text-error">{errores[k]}</span>;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setErrores({});
          setError(null);
          setForm(
            materia
              ? { id: materia.id, codigo: materia.codigo, nombre: materia.nombre, unidad: materia.unidad, minimo: String(materia.minimo), costo: materia.costo == null ? "" : String(materia.costo), notas: materia.notas ?? "", activo: materia.activo }
              : { codigo: "", nombre: "", unidad: "kg", minimo: "0", costo: "", notas: "", activo: true, stockInicial: "0" },
          );
        }}
        className={materia ? boton.secundario : boton.primario}
      >
        {materia ? <Pencil size={16} aria-hidden /> : <Plus size={16} strokeWidth={2.25} aria-hidden />}
        {materia ? "Editar" : "Nueva materia prima"}
      </button>
      {form && (
        <Modal titulo={form.id ? "Editar materia prima" : "Nueva materia prima"} sub="Base, aromatizantes, colorantes, envases, etiquetas…" cerrar={() => setForm(null)}>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
              Código
              <input value={form.codigo} onChange={(e) => set("codigo", e.target.value.toUpperCase().replace(/\s/g, "-"))} maxLength={30} placeholder="ARO-LAV" className={`${entradaAdmin} font-mono uppercase`} />
              {err("codigo")}
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
              Unidad
              <select value={form.unidad} onChange={(e) => set("unidad", e.target.value)} className={`${entradaAdmin} cursor-pointer`}>
                {UNIDADES.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
              </select>
              {err("unidad")}
            </label>
            <label className="col-span-2 flex flex-col gap-1.5 text-[13px] font-semibold">
              Nombre
              <input value={form.nombre} onChange={(e) => set("nombre", e.target.value)} maxLength={120} placeholder="Aromatizante lavanda" className={entradaAdmin} />
              {err("nombre")}
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
              Stock mínimo ({form.unidad})
              <input value={form.minimo} onChange={(e) => set("minimo", e.target.value)} inputMode="decimal" className={`${entradaAdmin} text-right tabular-nums`} />
              {err("minimo")}
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
              Costo por {form.unidad} (L.)
              <input value={form.costo} onChange={(e) => set("costo", e.target.value)} inputMode="decimal" placeholder="Se actualiza al comprar" className={`${entradaAdmin} text-right tabular-nums`} />
              {err("costo")}
            </label>
            {!form.id && (
              <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
                Stock inicial ({form.unidad})
                <input value={form.stockInicial} onChange={(e) => set("stockInicial", e.target.value)} inputMode="decimal" className={`${entradaAdmin} text-right tabular-nums`} />
                {err("stockInicial")}
              </label>
            )}
            <label className="col-span-2 flex flex-col gap-1.5 text-[13px] font-semibold">
              Notas (opcional)
              <input value={form.notas} onChange={(e) => set("notas", e.target.value)} maxLength={300} placeholder="Proveedor habitual, presentación…" className={entradaAdmin} />
            </label>
          </div>
          <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm">
            <input type="checkbox" checked={form.activo} onChange={(e) => set("activo", e.target.checked)} className="size-5 accent-[var(--navy)]" />
            Activa (aparece en compras y reglas de creación)
          </label>
          {error && <MensajeError>{error}</MensajeError>}
          <div className="flex justify-end gap-2.5">
            <button type="button" onClick={() => setForm(null)} className={boton.secundario}>Cancelar</button>
            <button
              type="button"
              disabled={pendiente}
              onClick={() =>
                iniciar(async () => {
                  const r = await guardarMateria(form);
                  if (r.error) {
                    setError(r.error);
                    setErrores(r.errores ?? {});
                    return;
                  }
                  setForm(null);
                  if (!form.id && r.id) router.push(`/admin/materia-prima/${r.id}`);
                  else router.refresh();
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

export function BotonAjusteMateria({ materia }: { materia: MateriaPrima }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [cant, setCant] = useState("");
  const [nota, setNota] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();
  const n = Number(cant.replace(/,/g, ""));

  return (
    <>
      <button type="button" onClick={() => { setAbierto(true); setError(null); setCant(""); setNota(""); }} className={boton.primario}>
        <SlidersHorizontal size={16} aria-hidden />
        Ajustar stock
      </button>
      {abierto && (
        <Modal titulo={`Ajustar · ${materia.nombre}`} sub={<>Stock actual <strong className="text-navy">{cantidad(materia.stock, materia.unidad)}</strong>. Positivo suma (conteo), negativo resta (merma, derrame).</>} cerrar={() => setAbierto(false)}>
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
            Cantidad en {materia.unidad} (+ / −)
            <input value={cant} onChange={(e) => setCant(e.target.value)} inputMode="decimal" placeholder="Ej.: 2.5 o -0.75" className={`${entradaAdmin} text-right text-base tabular-nums`} />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
            Motivo
            <input value={nota} onChange={(e) => setNota(e.target.value)} maxLength={200} placeholder="Ej.: conteo físico, se derramó" className={entradaAdmin} />
          </label>
          {Number.isFinite(n) && n !== 0 && (
            <div className="flex justify-between rounded-sm bg-surface px-3.5 py-3 text-sm">
              <span className="text-text-2">Nuevo stock</span>
              <strong className={`tabular-nums ${materia.stock + n < 0 ? "text-error" : ""}`}>{cantidad(Math.round((materia.stock + n) * 1000) / 1000, materia.unidad)}</strong>
            </div>
          )}
          {error && <MensajeError>{error}</MensajeError>}
          <div className="flex justify-end gap-2.5">
            <button type="button" onClick={() => setAbierto(false)} className={boton.secundario}>Cancelar</button>
            <button
              type="button"
              disabled={pendiente}
              onClick={() => iniciar(async () => {
                const r = await ajustarMateria(materia.id, cant, nota);
                if (r.error) return setError(r.error);
                setAbierto(false);
                router.refresh();
              })}
              className={boton.primario}
            >
              {pendiente ? "Guardando…" : "Aplicar ajuste"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

export function TablaMaterias({ filas }: { filas: MateriaPrima[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [bajo, setBajo] = useState(false);
  const lista = useMemo(() => {
    const nq = norm(q.trim());
    return filas.filter((m) => (!bajo || m.stock <= m.minimo) && (!nq || norm(`${m.codigo} ${m.nombre}`).includes(nq)));
  }, [filas, q, bajo]);

  return (
    <div className="overflow-hidden rounded-md bg-white shadow-[inset_0_0_0_1px_var(--border)]">
      <div className="flex flex-wrap items-center gap-2.5 border-b border-line px-4 py-3.5">
        <button
          type="button"
          aria-pressed={bajo}
          onClick={() => setBajo((b) => !b)}
          className={`inline-flex h-[34px] items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold ${bajo ? "bg-error-50 text-error shadow-[inset_0_0_0_1.5px_var(--error)]" : "shadow-[inset_0_0_0_1.5px_var(--border)]"}`}
        >
          <AlertTriangle size={14} aria-hidden />
          Solo stock bajo
        </button>
        <label className="ml-auto flex h-10 min-w-[200px] max-w-[340px] flex-1 items-center gap-2 rounded-full bg-surface px-3.5 text-text-2 shadow-[inset_0_0_0_1px_var(--border)]">
          <Search size={16} aria-hidden />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Código o nombre" aria-label="Buscar materia prima" className="min-w-0 flex-1 bg-transparent text-sm text-navy outline-none" />
        </label>
      </div>
      {lista.length === 0 ? (
        <Vacio titulo={filas.length ? "Nada coincide" : "Todavía no hay materia prima"} texto={filas.length ? undefined : "Crea tu catálogo: base, aromatizantes, colorantes, envases. Después arma las reglas de creación de cada producto."} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse">
            <thead>
              <tr><th className={th}>Materia prima</th><th className={`${th} text-right`}>Stock</th><th className={`${th} text-right`}>Mínimo</th><th className={`${th} text-right`}>Costo</th><th className={`${th} text-right`}>Valor</th><th className={th}>Estado</th></tr>
            </thead>
            <tbody>
              {lista.map((m) => (
                <tr key={m.id} onClick={() => router.push(`/admin/materia-prima/${m.id}`)} className="cursor-pointer hover:bg-surface">
                  <td className={td}>
                    <div className="font-semibold">{m.nombre}</div>
                    <div className="font-mono text-xs text-text-2">{m.codigo}</div>
                  </td>
                  <td className={`${td} whitespace-nowrap text-right font-semibold tabular-nums ${m.stock <= m.minimo ? "text-error" : ""}`}>{cantidad(m.stock, m.unidad)}</td>
                  <td className={`${td} whitespace-nowrap text-right text-[13px] tabular-nums text-text-2`}>{cantidad(m.minimo, m.unidad)}</td>
                  <td className={`${td} whitespace-nowrap text-right text-[13px] tabular-nums`}>{m.costo == null ? <span className="text-warning">Sin costo</span> : `${lempiras(m.costo)} / ${m.unidad}`}</td>
                  <td className={`${td} whitespace-nowrap text-right font-bold tabular-nums`}>{m.costo == null ? "—" : lempiras(m.costo * m.stock)}</td>
                  <td className={td}>
                    {!m.activo ? <Chip className="bg-surface text-text-2">Inactiva</Chip> : m.stock <= m.minimo ? <Chip className="bg-error-50 text-error">Stock bajo</Chip> : <Chip className="bg-surface text-text-2">OK</Chip>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
