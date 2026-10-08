"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FolderTree, Pencil, Plus } from "lucide-react";
import { guardarCategoria, type DatosCategoria } from "@/acciones/admin";
import { MensajeError } from "@/components/ui/campo";
import { AROMAS, AROMA_IDS, prefijoCategoria } from "@/lib/catalogo";
import type { CategoriaAdmin } from "@/lib/datos/admin";
import { entradaAdmin, Modal } from "./modal";
import { boton, Chip, td, th } from "./ui";

/** Modal para crear o editar una categoría. Al crear, `alGuardar` recibe el id nuevo. */
export function ModalCategoria({ categoria, cerrar, alGuardar }: { categoria?: CategoriaAdmin; cerrar: () => void; alGuardar?: (id: string) => void }) {
  const router = useRouter();
  const [form, setForm] = useState<DatosCategoria>(
    categoria ? { id: categoria.id, nombre: categoria.nombre, corto: categoria.corto, tinte: categoria.tinte ?? "", activo: categoria.activo } : { nombre: "", corto: "", tinte: "", activo: true },
  );
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();
  const set = <K extends keyof DatosCategoria>(k: K, v: DatosCategoria[K]) => setForm((f) => ({ ...f, [k]: v }));
  const err = (k: string) => errores[k] && <span className="text-xs font-semibold text-error">{errores[k]}</span>;

  return (
    <Modal
      titulo={categoria ? `Editar categoría ${prefijoCategoria(categoria.numero)}` : "Nueva categoría"}
      sub={categoria ? "El número no cambia: es el inicio del código de sus productos." : "Recibe el siguiente número (ej. 09) y sus productos se codifican 090001, 090002…"}
      cerrar={cerrar}
    >
      <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
        Nombre
        <input value={form.nombre} onChange={(e) => set("nombre", e.target.value)} maxLength={60} placeholder="Línea industrial" className={entradaAdmin} autoFocus />
        {err("nombre")}
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
          Nombre corto (menú)
          <input value={form.corto} onChange={(e) => set("corto", e.target.value)} maxLength={30} placeholder="Industrial" className={entradaAdmin} />
          {err("corto")}
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
          Color de la tarjeta
          <select value={form.tinte} onChange={(e) => set("tinte", e.target.value)} className={`${entradaAdmin} cursor-pointer`}>
            <option value="">Sin color</option>
            {AROMA_IDS.map((a) => <option key={a} value={a}>{AROMAS[a]}</option>)}
          </select>
          {err("tinte")}
        </label>
      </div>
      <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm">
        <input type="checkbox" checked={form.activo} onChange={(e) => set("activo", e.target.checked)} className="size-5 accent-[var(--navy)]" />
        Visible en la tienda
      </label>
      {error && <MensajeError>{error}</MensajeError>}
      <div className="flex justify-end gap-2.5">
        <button type="button" onClick={cerrar} className={boton.secundario}>Cancelar</button>
        <button
          type="button"
          disabled={pendiente}
          onClick={() =>
            iniciar(async () => {
              const r = await guardarCategoria(form);
              if (r.error) {
                setError(r.error);
                setErrores(r.errores ?? {});
                return;
              }
              alGuardar?.(r.id!);
              cerrar();
              router.refresh();
            })
          }
          className={boton.primario}
        >
          {pendiente ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </Modal>
  );
}

/** Lista de categorías con su número, para crear y editar. */
export function BotonCategorias({ categorias }: { categorias: CategoriaAdmin[] }) {
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<CategoriaAdmin | "nueva" | null>(null);
  return (
    <>
      <button type="button" onClick={() => setAbierto(true)} className={boton.secundario}>
        <FolderTree size={16} aria-hidden />
        Categorías
      </button>
      {abierto && !editando && (
        <Modal titulo="Categorías" sub="El número de la categoría es el inicio del código de sus productos." cerrar={() => setAbierto(false)}>
          <div className="-mx-1 max-h-[55vh] overflow-y-auto">
            <table className="w-full border-collapse">
              <thead><tr><th className={th}>N.º</th><th className={th}>Categoría</th><th className={`${th} text-right`}>Productos</th><th className={th} /></tr></thead>
              <tbody>
                {categorias.map((c) => (
                  <tr key={c.id}>
                    <td className={`${td} font-mono font-bold`}>{prefijoCategoria(c.numero)}</td>
                    <td className={td}>
                      <span className="font-semibold">{c.nombre}</span>
                      {!c.activo && <Chip chico className="ml-2 bg-surface text-text-2">Oculta</Chip>}
                    </td>
                    <td className={`${td} text-right tabular-nums`}>{c.productos}</td>
                    <td className={`${td} text-right`}>
                      <button type="button" onClick={() => setEditando(c)} aria-label={`Editar ${c.nombre}`} className="inline-flex size-10 items-center justify-center rounded-sm text-text-2 hover:bg-surface hover:text-navy">
                        <Pencil size={15} aria-hidden />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={() => setEditando("nueva")} className={boton.primario}>
              <Plus size={16} strokeWidth={2.25} aria-hidden />
              Nueva categoría
            </button>
          </div>
        </Modal>
      )}
      {editando && <ModalCategoria categoria={editando === "nueva" ? undefined : editando} cerrar={() => setEditando(null)} />}
    </>
  );
}
