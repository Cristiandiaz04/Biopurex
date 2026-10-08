"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Pencil, Plus, Search } from "lucide-react";
import { guardarProveedor, type DatosProveedor } from "@/acciones/admin-docs";
import { MensajeError } from "@/components/ui/campo";
import type { Proveedor } from "@/lib/datos/admin-docs";
import { lempiras } from "@/lib/formato";
import { entradaAdmin, Modal } from "./modal";
import { boton, td, th, Vacio } from "./ui";

const vacio: DatosProveedor = { nombre: "", rtn: "", contacto: "", telefono: "", correo: "", direccion: "", ciudad: "", condiciones: "Contado" };
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Botón + diálogo para crear o editar un proveedor. */
export function BotonProveedor({ proveedor }: { proveedor?: Proveedor }) {
  const router = useRouter();
  const [form, setForm] = useState<DatosProveedor | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();
  const set = (k: keyof DatosProveedor, v: string) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const campo = (k: keyof DatosProveedor, label: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}, ancho = false) => (
    <label className={`flex flex-col gap-1.5 text-[13px] font-semibold ${ancho ? "col-span-2" : ""}`}>
      {label}
      <input value={form![k] ?? ""} onChange={(e) => set(k, e.target.value)} className={entradaAdmin} {...extra} />
      {errores[k] && <span className="text-xs font-semibold text-error">{errores[k]}</span>}
    </label>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setErrores({});
          setError(null);
          setForm(
            proveedor
              ? {
                  id: proveedor.id,
                  nombre: proveedor.nombre,
                  rtn: proveedor.rtn ?? "",
                  contacto: proveedor.contacto ?? "",
                  telefono: proveedor.telefono ?? "",
                  correo: proveedor.correo ?? "",
                  direccion: proveedor.direccion ?? "",
                  ciudad: proveedor.ciudad ?? "",
                  condiciones: proveedor.condiciones,
                }
              : vacio,
          );
        }}
        className={proveedor ? boton.secundario : boton.primario}
      >
        {proveedor ? <Pencil size={16} aria-hidden /> : <Plus size={16} strokeWidth={2.25} aria-hidden />}
        {proveedor ? "Editar" : "Nuevo proveedor"}
      </button>
      {form && (
        <Modal titulo={form.id ? "Editar proveedor" : "Nuevo proveedor"} cerrar={() => setForm(null)}>
          <div className="grid grid-cols-2 gap-3">
            {campo("nombre", "Nombre o razón social", { maxLength: 120 }, true)}
            {campo("rtn", "RTN", { inputMode: "numeric", placeholder: "14 dígitos" })}
            {campo("condiciones", "Condiciones", { placeholder: "Contado, Crédito 30 días…", maxLength: 60 })}
            {campo("contacto", "Contacto", { maxLength: 120 })}
            {campo("telefono", "Teléfono", { inputMode: "numeric", placeholder: "9876-5432" })}
            {campo("correo", "Correo", { type: "email" }, true)}
            {campo("direccion", "Dirección", { maxLength: 200 })}
            {campo("ciudad", "Ciudad", { maxLength: 80 })}
          </div>
          {error && <MensajeError>{error}</MensajeError>}
          <div className="flex justify-end gap-2.5">
            <button type="button" onClick={() => setForm(null)} className={boton.secundario}>Cancelar</button>
            <button
              type="button"
              disabled={pendiente}
              onClick={() =>
                iniciar(async () => {
                  const r = await guardarProveedor(form);
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
              {pendiente ? "Guardando…" : "Guardar proveedor"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

export function TablaProveedores({ filas }: { filas: (Proveedor & { compras: number; totalComprado: number })[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const lista = useMemo(() => {
    const nq = norm(q.trim());
    return filas.filter((p) => !nq || norm(`${p.nombre} ${p.contacto ?? ""} ${p.ciudad ?? ""} ${p.rtn ?? ""}`).includes(nq));
  }, [filas, q]);

  return (
    <div className="overflow-hidden rounded-md bg-white shadow-[inset_0_0_0_1px_var(--border)]">
      <div className="border-b border-line px-4 py-3.5">
        <label className="flex h-10 max-w-[340px] items-center gap-2 rounded-full bg-surface px-3.5 text-text-2 shadow-[inset_0_0_0_1px_var(--border)]">
          <Search size={16} aria-hidden />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre, contacto, ciudad o RTN" aria-label="Buscar proveedores" className="min-w-0 flex-1 bg-transparent text-sm text-navy outline-none" />
        </label>
      </div>
      {lista.length === 0 ? (
        <Vacio titulo={filas.length ? "No encontramos proveedores" : "Todavía no hay proveedores"} texto={filas.length ? undefined : "Agrega a quienes te venden insumos y producto para registrar tus compras."} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse">
            <thead>
              <tr><th className={th}>Proveedor</th><th className={th}>Contacto</th><th className={th}>Ciudad</th><th className={th}>Condiciones</th><th className={`${th} text-right`}>Compras</th><th className={`${th} text-right`}>Total comprado</th></tr>
            </thead>
            <tbody>
              {lista.map((p) => (
                <tr key={p.id} onClick={() => router.push(`/admin/proveedores/${p.id}`)} className="cursor-pointer hover:bg-surface">
                  <td className={td}>
                    <div className="font-semibold">{p.nombre}</div>
                    <div className="text-xs text-text-2">{p.rtn ? `RTN ${p.rtn}` : "Sin RTN"}</div>
                  </td>
                  <td className={td}>
                    <div>{p.contacto ?? "—"}</div>
                    <div className="text-xs text-text-2">{p.telefono ? p.telefono.replace(/^(\d{4})(\d{4})$/, "$1-$2") : ""}</div>
                  </td>
                  <td className={`${td} text-[13px]`}>{p.ciudad ?? "—"}</td>
                  <td className={`${td} text-[13px]`}>{p.condiciones}</td>
                  <td className={`${td} text-right`}>{p.compras}</td>
                  <td className={`${td} whitespace-nowrap text-right font-bold tabular-nums`}>{lempiras(p.totalComprado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
