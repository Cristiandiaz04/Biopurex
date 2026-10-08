"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { guardarProducto, type DatosProducto } from "@/acciones/admin";
import { MensajeError } from "@/components/ui/campo";
import { AROMAS, AROMA_IDS, aromaVar, prefijoCategoria } from "@/lib/catalogo";
import type { CategoriaAdmin } from "@/lib/datos/admin";
import { ModalCategoria } from "./categorias";
import { boton } from "./ui";

const TAMANOS = ["Galón", "Litro", "740 ml", "20 L", "Spray", "Unidad", "Paquete", "Rollo", "Caja"];
const entrada =
  "h-11 w-full rounded-sm border-[1.5px] bg-white px-3 text-sm text-navy outline-none focus:border-navy";
const area = "w-full resize-y rounded-sm border-[1.5px] bg-white px-3 py-2.5 text-sm leading-normal text-navy outline-none focus:border-navy";

function Etiqueta({ label, error, ayuda, children, className = "" }: { label: string; error?: string; ayuda?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1.5 text-[13px] font-semibold ${className}`}>
      {label}
      {children}
      {ayuda && !error && <span className="text-xs font-normal text-text-2">{ayuda}</span>}
      {error && <span className="text-xs font-semibold text-error">{error}</span>}
    </label>
  );
}

export function FormularioProducto({ inicial, tieneAromas, categorias, codigo }: { inicial: DatosProducto; tieneAromas: boolean; categorias: CategoriaAdmin[]; codigo?: string }) {
  const router = useRouter();
  const [d, setD] = useState(inicial);
  const [otroTamano, setOtroTamano] = useState(!!inicial.tamano && !TAMANOS.includes(inicial.tamano));
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();
  const [nuevaCat, setNuevaCat] = useState(false);
  const nuevo = !d.id;
  const catSel = categorias.find((c) => c.id === d.categoria);

  const set = <K extends keyof DatosProducto>(k: K, v: DatosProducto[K]) => {
    setD((x) => ({ ...x, [k]: v }));
    setOk(null);
  };
  const borde = (k: string) => (errores[k] ? "border-error" : "border-line");

  function guardar() {
    setError(null);
    iniciar(async () => {
      const r = await guardarProducto(d);
      if (r.error) {
        setError(r.error);
        setErrores(r.errores ?? {});
        return;
      }
      setErrores({});
      setOk(r.ok ?? null);
      if (nuevo && r.slug) router.push(`/admin/productos/${r.slug}?creado=1`);
      else router.refresh();
    });
  }

  return (
    <div className="rounded-md bg-white shadow-[inset_0_0_0_1px_var(--border)]">
      <div className="border-b border-line px-4 py-3">
        <h2 className="m-0 text-base font-bold">{nuevo ? "Datos del producto" : "Editar producto"}</h2>
        {nuevo && <p className="mb-0 mt-1 text-[13px] text-text-2">Cada presentación es un producto aparte. Después de crearlo le agregas los aromas, la foto y el stock.</p>}
      </div>
      <div className="grid grid-cols-1 gap-4 p-4 min-[900px]:grid-cols-2">
        <Etiqueta label="Nombre del producto" error={errores.nombreBase} ayuda="Sin la presentación. Ej.: Desinfectante Multiusos">
          <input className={`${entrada} ${borde("nombreBase")}`} value={d.nombreBase} onChange={(e) => set("nombreBase", e.target.value)} maxLength={120} />
        </Etiqueta>
        <Etiqueta label="Presentación" error={errores.tamano} ayuda="Galón, Litro, 740 ml y 20 L se agregan al nombre en la tienda.">
          <div className="flex gap-2">
            <select
              className={`${entrada} ${borde("tamano")} cursor-pointer`}
              value={otroTamano ? "__otro" : d.tamano}
              onChange={(e) => {
                const v = e.target.value;
                setOtroTamano(v === "__otro");
                set("tamano", v === "__otro" ? "" : v);
              }}
            >
              <option value="" disabled>Elige…</option>
              {TAMANOS.map((t) => (
                <option key={t}>{t}</option>
              ))}
              <option value="__otro">Otra…</option>
            </select>
            {otroTamano && <input className={`${entrada} ${borde("tamano")}`} value={d.tamano} onChange={(e) => set("tamano", e.target.value)} placeholder="Ej.: 3.8 L" maxLength={40} />}
          </div>
        </Etiqueta>
        <Etiqueta
          label="Categoría"
          error={errores.categoria}
          ayuda={
            codigo
              ? `Código ${codigo}${catSel && !codigo.startsWith(prefijoCategoria(catSel.numero)) ? ` · al guardar recibe un código ${prefijoCategoria(catSel.numero)}xxxx` : ""}`
              : catSel
                ? `El código se asigna al guardar: ${prefijoCategoria(catSel.numero)}0001, ${prefijoCategoria(catSel.numero)}0002…`
                : undefined
          }
        >
          <div className="flex gap-2">
            <select className={`${entrada} ${borde("categoria")} cursor-pointer`} value={d.categoria} onChange={(e) => set("categoria", e.target.value)}>
              <option value="" disabled>Elige…</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {prefijoCategoria(c.numero)} · {c.nombre}
                  {c.activo ? "" : " (oculta)"}
                </option>
              ))}
            </select>
            <button type="button" onClick={() => setNuevaCat(true)} title="Nueva categoría" aria-label="Nueva categoría" className="flex size-11 flex-none items-center justify-center rounded-sm shadow-[inset_0_0_0_1.5px_var(--border)] hover:bg-surface">
              <Plus size={18} aria-hidden />
            </button>
          </div>
        </Etiqueta>
        {nuevaCat && <ModalCategoria cerrar={() => setNuevaCat(false)} alGuardar={(id) => set("categoria", id)} />}
        <div className="grid grid-cols-2 gap-3">
          <Etiqueta label="Precio de venta (L.)" error={errores.precio} ayuda="Incluye ISV.">
            <input className={`${entrada} ${borde("precio")} text-right tabular-nums`} inputMode="decimal" value={d.precio} onChange={(e) => set("precio", e.target.value)} placeholder="0.00" />
          </Etiqueta>
          <Etiqueta label="Costo (L.)" error={errores.costo} ayuda="Para valorizar inventario.">
            <input className={`${entrada} ${borde("costo")} text-right tabular-nums`} inputMode="decimal" value={d.costo} onChange={(e) => set("costo", e.target.value)} placeholder="0.00" />
          </Etiqueta>
        </div>
        <Etiqueta label="Descripción" error={errores.descripcion} className="min-[900px]:col-span-2">
          <textarea className={`${area} ${borde("descripcion")}`} rows={3} maxLength={1500} value={d.descripcion} onChange={(e) => set("descripcion", e.target.value)} placeholder="Texto del catálogo." />
        </Etiqueta>
        <Etiqueta label="Beneficios" ayuda="Uno por línea.">
          <textarea className={`${area} border-line`} rows={4} value={d.beneficios} onChange={(e) => set("beneficios", e.target.value)} placeholder={"Elimina el 99.9% de bacterias y gérmenes.\nLimpieza profunda…"} />
        </Etiqueta>
        <Etiqueta label="Modo de uso" ayuda="Un paso por línea.">
          <textarea className={`${area} border-line`} rows={4} value={d.modoUso} onChange={(e) => set("modoUso", e.target.value)} />
        </Etiqueta>

        {!tieneAromas && (
          <div className="flex flex-col gap-1.5 min-[900px]:col-span-2">
            <span className="text-[13px] font-semibold">Color de fondo en la tienda</span>
            <span className="text-xs text-text-2">Para productos sin aroma. Si tiene aromas, el fondo toma el color de cada aroma.</span>
            <div role="radiogroup" aria-label="Color de fondo" className="flex flex-wrap gap-1">
              <button type="button" role="radio" aria-checked={!d.tinte} onClick={() => set("tinte", "")} className={`h-9 rounded-full px-3 text-xs font-semibold ${!d.tinte ? "bg-navy text-white" : "shadow-[inset_0_0_0_1.5px_var(--border)]"}`}>
                Gris
              </button>
              {AROMA_IDS.map((a) => (
                <button key={a} type="button" role="radio" aria-checked={d.tinte === a} title={AROMAS[a]} aria-label={AROMAS[a]} onClick={() => set("tinte", a)} className="flex size-9 items-center justify-center rounded-full">
                  <span className="size-6 rounded-full" style={{ background: aromaVar(a), boxShadow: d.tinte === a ? "0 0 0 2px var(--bg), 0 0 0 4px var(--navy)" : "0 0 0 1px var(--border)" }} />
                </button>
              ))}
            </div>
          </div>
        )}

        <fieldset className="m-0 flex flex-wrap gap-x-6 gap-y-2 border-0 p-0 min-[900px]:col-span-2">
          <legend className="mb-1.5 text-[13px] font-semibold">Opciones</legend>
          {(
            [
              ["activo", "Visible en la tienda"],
              ["masVendido", "Insignia “Más vendido”"],
              ["nuevo", "Insignia “Nuevo”"],
              ["seguridad", "Mostrar aviso de seguridad (químicos)"],
              ["cotizar", "Se vende por cotización (sin precio fijo)"],
            ] as const
          ).map(([k, label]) => (
            <label key={k} className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm">
              <input type="checkbox" checked={d[k]} onChange={(e) => set(k, e.target.checked)} className="size-5 accent-[var(--navy)]" />
              {label}
            </label>
          ))}
        </fieldset>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-3">
        <button type="button" onClick={guardar} disabled={pendiente} className={boton.primario}>
          {pendiente ? "Guardando…" : nuevo ? "Crear producto" : "Guardar cambios"}
        </button>
        {ok && <span role="status" className="text-sm font-semibold text-success">{ok}</span>}
        {error && <div className="w-full"><MensajeError>{error}</MensajeError></div>}
      </div>
    </div>
  );
}
