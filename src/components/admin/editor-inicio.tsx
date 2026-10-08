"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Eye, EyeOff, Plus, Trash2, X } from "lucide-react";
import { eliminarSeccion, guardarFija, guardarSeccion, moverSeccion, type DatosSeccion } from "@/acciones/inicio";
import { MensajeError } from "@/components/ui/campo";
import { prefijoCategoria } from "@/lib/catalogo";
import type { CategoriaAdmin } from "@/lib/datos/admin";
import type { OpcionVariante, SeccionAdmin } from "@/lib/datos/admin-docs";
import { entradaAdmin } from "./modal";
import { boton, Chip, PuntoAroma, Tarjeta } from "./ui";

const MODOS = [
  ["manual", "Elegidos por mí", "Tú eliges los productos y el orden."],
  ["mas_vendidos", "Más vendidos (automático)", "Los que más se venden según los pedidos confirmados."],
  ["nuevos", "Nuevos (automático)", "Los productos marcados como «Nuevo» en su ficha."],
] as const;

/** Bloques fijos del diseño: se ocultan u ordenan, pero su contenido no se edita aquí. */
const FIJAS: Record<string, string> = {
  estrella: "Bloque del Desinfectante Multiusos (galón y litro) con su foto grande.",
  categorias: "Tarjetas de las categorías que tienen productos.",
  aromas: "Fila de círculos de colores para buscar por aroma.",
};

const vacia = (): DatosSeccion => ({ titulo: "", descripcion: "", modo: "manual", cantidad: 4, tema: "claro", categoriaId: "", activa: true, variantes: [] });

export function EditorInicio({ secciones, opciones, categorias }: { secciones: SeccionAdmin[]; opciones: OpcionVariante[]; categorias: CategoriaAdmin[] }) {
  const [nueva, setNueva] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      {secciones.map((s, i) =>
        FIJAS[s.modo] ? (
          <TarjetaFija key={s.id} seccion={s} primera={i === 0} ultima={i === secciones.length - 1} />
        ) : (
        <EditorSeccion key={s.id} inicial={s} opciones={opciones} categorias={categorias} primera={i === 0} ultima={i === secciones.length - 1} />
        ),
      )}
      {nueva ? (
        <EditorSeccion opciones={opciones} categorias={categorias} cerrar={() => setNueva(false)} />
      ) : (
        <button type="button" onClick={() => setNueva(true)} className="flex min-h-[72px] items-center justify-center gap-2 rounded-md border-2 border-dashed border-line font-semibold hover:border-navy hover:bg-white">
          <Plus size={18} aria-hidden />
          Nueva sección de productos
        </button>
      )}
    </div>
  );
}

function EditorSeccion({
  inicial,
  opciones,
  categorias,
  primera,
  ultima,
  cerrar,
}: {
  inicial?: SeccionAdmin;
  opciones: OpcionVariante[];
  categorias: CategoriaAdmin[];
  primera?: boolean;
  ultima?: boolean;
  cerrar?: () => void;
}) {
  const router = useRouter();
  const [abierta, setAbierta] = useState(!inicial);
  const [d, setD] = useState<DatosSeccion>(() =>
    inicial
      ? { id: inicial.id, titulo: inicial.titulo, descripcion: inicial.descripcion, modo: inicial.modo, cantidad: inicial.cantidad, tema: inicial.tema, categoriaId: inicial.categoriaId, activa: inicial.activa, variantes: inicial.variantes }
      : vacia(),
  );
  const [agregar, setAgregar] = useState("");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();
  const porId = new Map(opciones.map((o) => [o.id, o]));
  const grupos = [...new Set(opciones.map((o) => o.producto))];
  const set = <K extends keyof DatosSeccion>(k: K, v: DatosSeccion[K]) => {
    setD((x) => ({ ...x, [k]: v }));
    setOk(null);
  };
  const mover = (i: number, delta: number) => {
    const v = [...d.variantes];
    const j = i + delta;
    if (j < 0 || j >= v.length) return;
    [v[i], v[j]] = [v[j], v[i]];
    set("variantes", v);
  };
  const correr = (fn: () => Promise<{ ok?: string; error?: string; errores?: Record<string, string> }>, despues?: () => void) =>
    iniciar(async () => {
      setError(null);
      const r = await fn();
      if (r.error) {
        setError(r.error);
        setErrores(r.errores ?? {});
        return;
      }
      setErrores({});
      setOk(r.ok ?? null);
      despues?.();
      router.refresh();
    });
  const err = (k: string) => errores[k] && <span className="text-xs font-semibold text-error">{errores[k]}</span>;
  const modo = MODOS.find(([m]) => m === d.modo)!;

  return (
    <Tarjeta className={`overflow-hidden ${d.activa ? "" : "opacity-80"}`}>
      <div className="flex flex-wrap items-center gap-2.5 px-4 py-3">
        <button type="button" onClick={() => setAbierta((a) => !a)} aria-expanded={abierta} className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 text-left">
          <ChevronDown size={18} className={`flex-none transition-transform ${abierta ? "rotate-180" : ""}`} aria-hidden />
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-bold">{d.titulo || "Nueva sección"}</span>
            <span className="text-xs text-text-2">
              {modo[1]}
              {d.modo === "manual" ? ` · ${d.variantes.length} productos` : ` · hasta ${d.cantidad}`} · fondo {d.tema}
            </span>
          </span>
        </button>
        {d.activa ? <Chip chico className="bg-success-50 text-success">Visible</Chip> : <Chip chico className="bg-surface text-text-2">Oculta</Chip>}
        {inicial && (
          <div className="flex gap-1">
            <button type="button" disabled={primera || pendiente} onClick={() => correr(() => moverSeccion(inicial.id, "arriba"))} aria-label="Subir sección" className="flex size-10 items-center justify-center rounded-sm text-text-2 hover:bg-surface disabled:opacity-30">
              <ArrowUp size={16} aria-hidden />
            </button>
            <button type="button" disabled={ultima || pendiente} onClick={() => correr(() => moverSeccion(inicial.id, "abajo"))} aria-label="Bajar sección" className="flex size-10 items-center justify-center rounded-sm text-text-2 hover:bg-surface disabled:opacity-30">
              <ArrowDown size={16} aria-hidden />
            </button>
          </div>
        )}
      </div>

      {abierta && (
        <div className="flex flex-col gap-4 border-t border-line p-4">
          <div className="grid grid-cols-1 gap-3 min-[900px]:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
              Título
              <input value={d.titulo} onChange={(e) => set("titulo", e.target.value)} maxLength={60} placeholder="Más vendidos, Nuevos, Ofertas…" className={entradaAdmin} />
              {err("titulo")}
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
              Qué productos mostrar
              <select value={d.modo} onChange={(e) => set("modo", e.target.value)} className={`${entradaAdmin} cursor-pointer`}>
                {MODOS.map(([m, l]) => <option key={m} value={m}>{l}</option>)}
              </select>
              <span className="text-xs font-normal text-text-2">{modo[2]}</span>
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold min-[900px]:col-span-2">
              Texto debajo del título (opcional)
              <input value={d.descripcion} onChange={(e) => set("descripcion", e.target.value)} maxLength={300} className={entradaAdmin} />
              {err("descripcion")}
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
              Botón «Ver todo» lleva a
              <select value={d.categoriaId} onChange={(e) => set("categoriaId", e.target.value)} className={`${entradaAdmin} cursor-pointer`}>
                <option value="">Todo el catálogo</option>
                {categorias.map((c) => <option key={c.id} value={c.id}>{prefijoCategoria(c.numero)} · {c.nombre}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
                Fondo
                <select value={d.tema} onChange={(e) => set("tema", e.target.value)} className={`${entradaAdmin} cursor-pointer`}>
                  <option value="claro">Claro</option>
                  <option value="oscuro">Oscuro (como la línea automotriz)</option>
                </select>
              </label>
              {d.modo !== "manual" && (
                <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
                  Cuántos mostrar
                  <select value={d.cantidad} onChange={(e) => set("cantidad", Number(e.target.value))} className={`${entradaAdmin} cursor-pointer`}>
                    {[4, 8, 12].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                  {err("cantidad")}
                </label>
              )}
            </div>
          </div>

          {d.modo === "manual" && (
            <div className="flex flex-col gap-2">
              <div className="text-[13px] font-semibold">Productos ({d.variantes.length} de 12) · se muestran en este orden</div>
              {d.variantes.length > 0 && (
                <ol className="m-0 flex list-none flex-col gap-1.5 p-0">
                  {d.variantes.map((id, i) => {
                    const o = porId.get(id);
                    return (
                      <li key={id} className="flex items-center gap-2.5 rounded-sm px-2.5 py-1.5 shadow-[inset_0_0_0_1px_var(--border)]">
                        <span className="w-5 text-center text-xs font-bold text-text-2">{i + 1}</span>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={o?.img || "/img/logo.png"} alt="" className="size-9 flex-none object-contain" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{o?.producto ?? "Producto eliminado"}</span>
                          {o && <span className="flex items-center gap-1.5 text-xs text-text-2"><PuntoAroma aroma={o.aroma} />{o.etiqueta}</span>}
                        </span>
                        <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Subir" className="flex size-9 items-center justify-center rounded-sm text-text-2 hover:bg-surface disabled:opacity-30"><ArrowUp size={15} aria-hidden /></button>
                        <button type="button" onClick={() => mover(i, 1)} disabled={i === d.variantes.length - 1} aria-label="Bajar" className="flex size-9 items-center justify-center rounded-sm text-text-2 hover:bg-surface disabled:opacity-30"><ArrowDown size={15} aria-hidden /></button>
                        <button type="button" onClick={() => set("variantes", d.variantes.filter((x) => x !== id))} aria-label="Quitar" className="flex size-9 items-center justify-center rounded-sm text-text-2 hover:bg-error-50 hover:text-error"><X size={15} aria-hidden /></button>
                      </li>
                    );
                  })}
                </ol>
              )}
              {d.variantes.length < 12 && (
                <div className="flex gap-2">
                  <select value={agregar} onChange={(e) => setAgregar(e.target.value)} aria-label="Producto para agregar" className={`${entradaAdmin} cursor-pointer`}>
                    <option value="">Elige un producto y aroma…</option>
                    {grupos.map((g) => (
                      <optgroup key={g} label={g}>
                        {opciones.filter((x) => x.producto === g).map((x) => (
                          <option key={x.id} value={x.id} disabled={d.variantes.includes(x.id)}>{x.etiqueta === g ? g : `${g} · ${x.etiqueta}`}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <button type="button" disabled={!agregar} onClick={() => { set("variantes", [...d.variantes, agregar]); setAgregar(""); }} className={boton.secundario}>
                    <Plus size={16} aria-hidden />
                    Agregar
                  </button>
                </div>
              )}
              {err("variantes")}
            </div>
          )}

          {error && <MensajeError>{error}</MensajeError>}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={pendiente}
              onClick={() => correr(() => guardarSeccion(d), inicial ? undefined : cerrar)}
              className={boton.primario}
            >
              {pendiente ? "Guardando…" : "Guardar sección"}
            </button>
            <button type="button" onClick={() => set("activa", !d.activa)} className={boton.secundario}>
              {d.activa ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
              {d.activa ? "Ocultar en el inicio" : "Mostrar en el inicio"}
            </button>
            {inicial ? (
              <button
                type="button"
                disabled={pendiente}
                onClick={() => {
                  if (window.confirm(`¿Eliminar la sección «${inicial.titulo}» del inicio? Los productos no se borran.`)) correr(() => eliminarSeccion(inicial.id));
                }}
                className={`${boton.secundario} ml-auto text-error`}
              >
                <Trash2 size={16} aria-hidden />
                Eliminar
              </button>
            ) : (
              <button type="button" onClick={cerrar} className={`${boton.secundario} ml-auto`}>
                Cancelar
              </button>
            )}
            {ok && <span role="status" className="w-full text-sm font-semibold text-success">{ok}. Ya se ve así en el inicio.</span>}
          </div>
        </div>
      )}
    </Tarjeta>
  );
}

function TarjetaFija({ seccion: s, primera, ultima }: { seccion: SeccionAdmin; primera: boolean; ultima: boolean }) {
  const router = useRouter();
  const [titulo, setTitulo] = useState(s.titulo);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();
  const correr = (fn: () => Promise<{ error?: string }>) =>
    iniciar(async () => {
      setError(null);
      const r = await fn();
      if (r.error) return setError(r.error);
      router.refresh();
    });
  const editableTitulo = s.modo !== "estrella";

  return (
    <Tarjeta className={`overflow-hidden ${s.activa ? "" : "opacity-70"}`}>
      <div className="flex flex-wrap items-center gap-2.5 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {editableTitulo ? (
              <input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                onBlur={() => titulo.trim() !== s.titulo && correr(() => guardarFija(s.id, titulo, s.activa))}
                maxLength={60}
                aria-label="Título del bloque"
                className="h-9 min-w-0 max-w-[260px] rounded-sm border-[1.5px] border-transparent bg-transparent px-1.5 text-[15px] font-bold text-navy outline-none hover:border-line focus:border-navy"
              />
            ) : (
              <span className="px-1.5 text-[15px] font-bold">{s.titulo}</span>
            )}
            <Chip chico className="bg-navy-50 text-navy">Bloque fijo</Chip>
          </div>
          <div className="px-1.5 text-xs text-text-2">{FIJAS[s.modo]}</div>
        </div>
        <button
          type="button"
          disabled={pendiente}
          onClick={() => correr(() => guardarFija(s.id, titulo, !s.activa))}
          className={s.activa ? boton.secundario : boton.primario}
        >
          {s.activa ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
          {s.activa ? "Ocultar" : "Mostrar"}
        </button>
        <div className="flex gap-1">
          <button type="button" disabled={primera || pendiente} onClick={() => correr(() => moverSeccion(s.id, "arriba"))} aria-label="Subir bloque" className="flex size-10 items-center justify-center rounded-sm text-text-2 hover:bg-surface disabled:opacity-30">
            <ArrowUp size={16} aria-hidden />
          </button>
          <button type="button" disabled={ultima || pendiente} onClick={() => correr(() => moverSeccion(s.id, "abajo"))} aria-label="Bajar bloque" className="flex size-10 items-center justify-center rounded-sm text-text-2 hover:bg-surface disabled:opacity-30">
            <ArrowDown size={16} aria-hidden />
          </button>
        </div>
      </div>
      {error && <div className="px-4 pb-3"><MensajeError>{error}</MensajeError></div>}
    </Tarjeta>
  );
}
