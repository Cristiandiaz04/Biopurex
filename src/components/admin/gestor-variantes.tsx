"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Pencil, Plus, SlidersHorizontal, Upload, X } from "lucide-react";
import { ajustarStock, guardarVariante, type DatosVariante } from "@/acciones/admin";
import { MensajeError } from "@/components/ui/campo";
import { AROMAS, AROMA_IDS, aromaVar, esAroma } from "@/lib/catalogo";
import type { Movimiento, VarianteAdmin } from "@/lib/datos/admin";
import { lempiras } from "@/lib/formato";
import { createClient } from "@/lib/supabase/client";
import { boton, Chip, fechaCorta, PuntoAroma, td, th } from "./ui";

const TIPO: Record<Movimiento["tipo"], [string, string]> = {
  entrada: ["Entrada", "bg-success-50 text-success"],
  venta: ["Salida", "bg-navy-50 text-navy"],
  apartado: ["Apartado", "bg-warning-50 text-warning"],
  liberacion: ["Liberado", "bg-surface text-navy"],
  devolucion: ["Devolución", "bg-navy text-white"],
  ajuste: ["Ajuste", "bg-error-50 text-error"],
};
const entrada = "h-11 w-full rounded-sm border-[1.5px] border-line bg-white px-3 text-sm text-navy outline-none focus:border-navy";

function Modal({ titulo, children, cerrar }: { titulo: string; children: React.ReactNode; cerrar: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && cerrar();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cerrar]);
  return (
    <div role="dialog" aria-modal="true" aria-label={titulo} className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div onClick={cerrar} className="absolute inset-0 bg-[var(--scrim)]" />
      <div className="relative flex max-h-full w-full max-w-[520px] flex-col gap-4 overflow-y-auto rounded-lg bg-white p-6 shadow-2">
        <div className="flex items-start justify-between gap-3">
          <h2 className="m-0 text-xl font-bold">{titulo}</h2>
          <button type="button" onClick={cerrar} aria-label="Cerrar" className="flex size-10 flex-none items-center justify-center rounded-full hover:bg-surface">
            <X size={20} aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function GestorVariantes({
  productoId,
  slug,
  costo,
  variantes,
  movimientos,
  seleccionInicial,
}: {
  productoId: string;
  slug: string;
  costo: number | null;
  variantes: VarianteAdmin[];
  movimientos: Movimiento[];
  seleccionInicial: string | null;
}) {
  const router = useRouter();
  const [sel, setSel] = useState(seleccionInicial && variantes.some((v) => v.id === seleccionInicial) ? seleccionInicial : variantes[0]?.id ?? null);
  const [filtro, setFiltro] = useState<Movimiento["tipo"] | null>(null);
  const [form, setForm] = useState<DatosVariante | null>(null);
  const [ajuste, setAjuste] = useState<{ cantidad: string; nota: string } | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [pendiente, iniciar] = useTransition();

  const v = variantes.find((x) => x.id === sel) ?? null;
  const movs = movimientos.filter((m) => m.varianteId === sel && (!filtro || m.tipo === filtro));
  const disp = v ? v.stock - v.apartado : 0;

  function nuevaVariante() {
    setErrores({});
    setError(null);
    setForm({ productoId, aroma: "", etiqueta: "", img: "", sku: slug.toUpperCase(), minimo: "10", activo: true, stockInicial: "0" });
  }

  function editar(x: VarianteAdmin) {
    setErrores({});
    setError(null);
    setForm({ id: x.id, productoId, aroma: x.aroma ?? "", etiqueta: x.etiqueta, img: x.img, sku: x.sku, minimo: String(x.minimo), activo: x.activo });
  }

  async function subirFoto(archivo: File | undefined) {
    if (!archivo || !form) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(archivo.type)) return setErrores((e) => ({ ...e, img: "JPG, PNG o WEBP" }));
    if (archivo.size > 3 * 1024 * 1024) return setErrores((e) => ({ ...e, img: "Máximo 3 MB" }));
    setSubiendo(true);
    const supabase = createClient();
    const path = `${slug}/${Date.now()}-${archivo.name.normalize("NFD").replace(/[^\w.-]+/g, "_").slice(-50)}`;
    const { error: e } = await supabase.storage.from("productos").upload(path, archivo, { contentType: archivo.type });
    setSubiendo(false);
    if (e) return setErrores((x) => ({ ...x, img: "No se pudo subir la foto" }));
    const { data } = supabase.storage.from("productos").getPublicUrl(path);
    setForm((f) => (f ? { ...f, img: data.publicUrl } : f));
    setErrores((x) => {
      const resto = { ...x };
      delete resto.img;
      return resto;
    });
  }

  function guardar() {
    if (!form) return;
    iniciar(async () => {
      const r = await guardarVariante(form, slug);
      if (r.error) {
        setError(r.error);
        setErrores(r.errores ?? {});
        return;
      }
      setForm(null);
      router.refresh();
    });
  }

  function aplicarAjuste() {
    if (!ajuste || !v) return;
    const n = Number(ajuste.cantidad);
    iniciar(async () => {
      const r = await ajustarStock(v.id, n, ajuste.nota, slug);
      if (r.error) return setError(r.error);
      setAjuste(null);
      router.refresh();
    });
  }

  return (
    <>
      <div className="mb-4 overflow-hidden rounded-md bg-white shadow-[inset_0_0_0_1px_var(--border)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            <h2 className="m-0 text-base font-bold">Aromas · variantes</h2>
            <span className="text-[13px] text-text-2">Elige una para ver su kardex</span>
          </div>
          <button type="button" onClick={nuevaVariante} className={boton.primario}>
            <Plus size={16} strokeWidth={2.25} aria-hidden />
            Agregar aroma
          </button>
        </div>
        {variantes.length === 0 ? (
          <p className="m-0 px-4 py-10 text-center text-sm text-text-2">
            Este producto todavía no tiene aromas ni foto. Agrega al menos uno para que aparezca en la tienda (si no lleva aroma, elige “Sin aroma”).
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse">
              <thead>
                <tr><th className={th}>Aroma</th><th className={th}>SKU</th><th className={`${th} text-right`}>Stock</th><th className={`${th} text-right`}>Apartado</th><th className={`${th} text-right`}>Disponible</th><th className={`${th} text-right`}>Mínimo</th><th className={th}>Estado</th><th className={th}></th></tr>
              </thead>
              <tbody>
                {variantes.map((x) => {
                  const d = x.stock - x.apartado;
                  const s = x.id === sel;
                  return (
                    <tr key={x.id} onClick={() => setSel(x.id)} className={`cursor-pointer hover:bg-navy-50 ${s ? "bg-navy-50 shadow-[inset_3px_0_0_var(--navy)]" : ""}`}>
                      <td className={td}>
                        <span className="flex items-center gap-2 whitespace-nowrap font-semibold">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={x.img} alt="" className="size-8 object-contain" />
                          <PuntoAroma aroma={x.aroma} tam={16} />
                          {x.etiqueta}
                        </span>
                      </td>
                      <td className={`${td} whitespace-nowrap font-mono text-xs`}>{x.sku}</td>
                      <td className={`${td} text-right tabular-nums`}>{x.stock}</td>
                      <td className={`${td} text-right tabular-nums text-warning`}>{x.apartado}</td>
                      <td className={`${td} text-right font-bold tabular-nums ${d <= x.minimo ? "text-error" : ""}`}>{d}</td>
                      <td className={`${td} text-right text-[13px] tabular-nums text-text-2`}>{x.minimo}</td>
                      <td className={td}>
                        {!x.activo ? <Chip className="bg-surface text-text-2">Oculto</Chip> : d <= x.minimo ? <Chip className="bg-error-50 text-error">Stock bajo</Chip> : <Chip className="bg-surface text-text-2">OK</Chip>}
                      </td>
                      <td className={`${td} text-right`}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            editar(x);
                          }}
                          aria-label={`Editar ${x.etiqueta}`}
                          className="flex size-9 items-center justify-center rounded-full hover:bg-white"
                        >
                          <Pencil size={16} aria-hidden />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {v && (
        <div className="overflow-hidden rounded-md bg-white shadow-[inset_0_0_0_1px_var(--border)]">
          <div className="flex flex-col gap-3.5 border-b border-line p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="size-9 flex-none rounded-full" style={{ background: esAroma(v.aroma) ? aromaVar(v.aroma) : "var(--white)", boxShadow: "0 0 0 3px var(--white), 0 0 0 4px var(--border)" }} />
                <div>
                  <h2 className="m-0 text-base font-bold">Kardex · {v.etiqueta}</h2>
                  <div className="font-mono text-xs text-text-2">{v.sku}</div>
                </div>
              </div>
              <button type="button" onClick={() => { setError(null); setAjuste({ cantidad: "", nota: "" }); }} className={boton.primario}>
                <SlidersHorizontal size={16} aria-hidden />
                Ajustar stock
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5 min-[900px]:grid-cols-4">
              <div className="rounded-sm bg-surface p-3"><div className="text-xs font-semibold text-text-2">Stock físico</div><div className="text-[22px] font-bold tabular-nums">{v.stock}</div></div>
              <div className="rounded-sm bg-warning-50 p-3"><div className="text-xs font-semibold text-warning">Apartado</div><div className="text-[22px] font-bold tabular-nums">{v.apartado}</div></div>
              <div className="rounded-sm bg-surface p-3"><div className="text-xs font-semibold text-text-2">Disponible · mín. {v.minimo}</div><div className={`text-[22px] font-bold tabular-nums ${disp <= v.minimo ? "text-error" : ""}`}>{disp}</div></div>
              <div className="rounded-sm bg-surface p-3"><div className="text-xs font-semibold text-text-2">Valor al costo</div><div className="text-[22px] font-bold tabular-nums">{costo == null ? "—" : lempiras(costo * v.stock)}</div></div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={() => setFiltro(null)} className={`h-8 rounded-full px-3 text-[13px] font-semibold ${!filtro ? "bg-navy text-white" : "shadow-[inset_0_0_0_1.5px_var(--border)]"}`}>
                Todos <span className="text-xs opacity-75">{movimientos.filter((m) => m.varianteId === sel).length}</span>
              </button>
              {(Object.keys(TIPO) as Movimiento["tipo"][]).map((t) => (
                <button key={t} type="button" onClick={() => setFiltro(t)} className={`h-8 rounded-full px-3 text-[13px] font-semibold ${filtro === t ? "bg-navy text-white" : "shadow-[inset_0_0_0_1.5px_var(--border)]"}`}>
                  {TIPO[t][0]} <span className="text-xs opacity-75">{movimientos.filter((m) => m.varianteId === sel && m.tipo === t).length}</span>
                </button>
              ))}
            </div>
          </div>
          {movs.length === 0 ? (
            <p className="m-0 px-4 py-10 text-center text-sm text-text-2">No hay movimientos de este tipo para la variante.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse">
                <thead>
                  <tr><th className={th}>Fecha</th><th className={th}>Movimiento</th><th className={th}>Documento</th><th className={th}>Detalle</th><th className={`${th} text-right`}>Entrada</th><th className={`${th} text-right`}>Salida</th><th className={`${th} text-right`}>Apartado ±</th><th className={`${th} text-right`}>Stock</th><th className={`${th} text-right`}>Apartado</th></tr>
                </thead>
                <tbody>
                  {movs.map((m) => {
                    const entra = m.tipo === "entrada" || m.tipo === "devolucion" || (m.tipo === "ajuste" && m.cantidad > 0);
                    const sale = m.tipo === "venta" || (m.tipo === "ajuste" && m.cantidad < 0);
                    const ap = m.tipo === "apartado" ? `+${m.cantidad}` : m.tipo === "liberacion" ? `−${m.cantidad}` : "";
                    return (
                      <tr key={m.id}>
                        <td className={`${td} whitespace-nowrap text-[13px] tabular-nums`}>{fechaCorta(m.creadoEn, true)}</td>
                        <td className={td}><Chip className={TIPO[m.tipo][1]}>{TIPO[m.tipo][0]}</Chip></td>
                        <td className={`${td} whitespace-nowrap text-[13px] font-semibold`}>
                          {m.documento?.startsWith("BPX-") ? <a href={`/admin/pedidos/${m.documento}`}>{m.documento}</a> : (m.documento ?? "—")}
                        </td>
                        <td className={`${td} text-[13px] text-text-2`}>{m.nota ?? ""}</td>
                        <td className={`${td} text-right font-semibold tabular-nums text-success`}>{entra ? Math.abs(m.cantidad) : ""}</td>
                        <td className={`${td} text-right font-semibold tabular-nums`}>{sale ? Math.abs(m.cantidad) : ""}</td>
                        <td className={`${td} text-right font-semibold tabular-nums text-warning`}>{ap}</td>
                        <td className={`${td} text-right font-bold tabular-nums`}>{m.stock}</td>
                        <td className={`${td} text-right tabular-nums text-text-2`}>{m.apartado}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {form && (
        <Modal titulo={form.id ? "Editar aroma" : "Agregar aroma"} cerrar={() => setForm(null)}>
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold">Aroma</span>
            <div role="radiogroup" aria-label="Aroma" className="flex flex-wrap gap-1">
              <button
                type="button"
                role="radio"
                aria-checked={!form.aroma}
                onClick={() => setForm({ ...form, aroma: "", etiqueta: form.etiqueta || "Única" })}
                className={`h-9 rounded-full px-3 text-xs font-semibold ${!form.aroma ? "bg-navy text-white" : "shadow-[inset_0_0_0_1.5px_var(--border)]"}`}
              >
                Sin aroma
              </button>
              {AROMA_IDS.map((a) => (
                <button
                  key={a}
                  type="button"
                  role="radio"
                  aria-checked={form.aroma === a}
                  title={AROMAS[a]}
                  aria-label={AROMAS[a]}
                  onClick={() => setForm({ ...form, aroma: a, etiqueta: AROMAS[a], sku: form.id ? form.sku : `${slug}-${a}`.toUpperCase() })}
                  className="flex size-9 items-center justify-center rounded-full"
                >
                  <span className="size-6 rounded-full" style={{ background: aromaVar(a), boxShadow: form.aroma === a ? "0 0 0 2px var(--bg), 0 0 0 4px var(--navy)" : "0 0 0 1px var(--border)" }} />
                </button>
              ))}
            </div>
            {errores.aroma && <span className="text-xs font-semibold text-error">{errores.aroma}</span>}
          </div>
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
            Nombre que verá el cliente
            <input className={entrada} value={form.etiqueta} onChange={(e) => setForm({ ...form, etiqueta: e.target.value })} maxLength={60} placeholder="Lavanda" />
            {errores.etiqueta && <span className="text-xs font-semibold text-error">{errores.etiqueta}</span>}
          </label>
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold">Foto</span>
            <div className="flex items-center gap-3">
              <span className="flex size-20 flex-none items-center justify-center rounded-md bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {form.img ? <img src={form.img} alt="" className="size-16 object-contain" /> : <Upload size={20} className="text-text-2" aria-hidden />}
              </span>
              <label className={`${boton.secundario} relative cursor-pointer`}>
                <Upload size={16} aria-hidden />
                {subiendo ? "Subiendo…" : form.img ? "Cambiar foto" : "Subir foto"}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => subirFoto(e.target.files?.[0])} className="absolute size-px opacity-0" />
              </label>
            </div>
            <span className="text-xs text-text-2">PNG o WEBP con fondo transparente se ve mejor. Máximo 3 MB.</span>
            {errores.img && <span className="text-xs font-semibold text-error">{errores.img}</span>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2 flex flex-col gap-1.5 text-[13px] font-semibold">
              SKU
              <input className={`${entrada} font-mono uppercase`} value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })} maxLength={60} />
              {errores.sku && <span className="text-xs font-semibold text-error">{errores.sku}</span>}
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
              Stock mínimo
              <input className={`${entrada} text-right tabular-nums`} inputMode="numeric" value={form.minimo} onChange={(e) => setForm({ ...form, minimo: e.target.value })} />
              {errores.minimo && <span className="text-xs font-semibold text-error">{errores.minimo}</span>}
            </label>
            {!form.id && (
              <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
                Stock inicial
                <input className={`${entrada} text-right tabular-nums`} inputMode="numeric" value={form.stockInicial} onChange={(e) => setForm({ ...form, stockInicial: e.target.value })} />
                {errores.stockInicial && <span className="text-xs font-semibold text-error">{errores.stockInicial}</span>}
              </label>
            )}
          </div>
          <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm">
            <input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} className="size-5 accent-[var(--navy)]" />
            Visible en la tienda
          </label>
          {error && <MensajeError>{error}</MensajeError>}
          <div className="flex justify-end gap-2.5">
            <button type="button" onClick={() => setForm(null)} className={boton.secundario}>Cancelar</button>
            <button type="button" onClick={guardar} disabled={pendiente || subiendo} className={boton.primario}>
              {pendiente ? "Guardando…" : form.id ? "Guardar aroma" : "Agregar aroma"}
            </button>
          </div>
        </Modal>
      )}

      {ajuste && v && (
        <Modal titulo={`Ajustar stock · ${v.etiqueta}`} cerrar={() => setAjuste(null)}>
          <p className="m-0 text-sm text-text-2">
            Stock actual <strong className="text-navy">{v.stock}</strong>. Usa un número positivo para sumar (conteo, devolución de proveedor) o negativo para restar (merma, producto dañado). Queda registrado en el kardex.
          </p>
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
            Cantidad (+ suma / − resta)
            <input className={`${entrada} text-right text-base tabular-nums`} inputMode="numeric" value={ajuste.cantidad} onChange={(e) => setAjuste({ ...ajuste, cantidad: e.target.value })} placeholder="Ej.: 12 o -3" />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
            Motivo
            <input className={entrada} value={ajuste.nota} onChange={(e) => setAjuste({ ...ajuste, nota: e.target.value })} maxLength={200} placeholder="Ej.: conteo físico, envase dañado" />
          </label>
          {Number(ajuste.cantidad) !== 0 && Number.isInteger(Number(ajuste.cantidad)) && (
            <div className="flex justify-between rounded-sm bg-surface px-3.5 py-3 text-sm">
              <span className="text-text-2">Nuevo stock</span>
              <strong className="tabular-nums">{v.stock + Number(ajuste.cantidad)}</strong>
            </div>
          )}
          {error && <MensajeError>{error}</MensajeError>}
          <div className="flex justify-end gap-2.5">
            <button type="button" onClick={() => setAjuste(null)} className={boton.secundario}>Cancelar</button>
            <button type="button" onClick={aplicarAjuste} disabled={pendiente} className={boton.primario}>
              {pendiente ? "Guardando…" : "Aplicar ajuste"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
