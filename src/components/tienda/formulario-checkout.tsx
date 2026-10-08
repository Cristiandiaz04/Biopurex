"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertTriangle, ChevronLeft, Copy, Check, MapPin } from "lucide-react";
import { crearPedido } from "@/app/checkout/acciones";
import { Campo, MensajeError, Selector } from "@/components/ui/campo";
import { AROMAS, aromaVar } from "@/lib/catalogo";
import type { Configuracion } from "@/lib/datos/catalogo";
import type { Direccion, Perfil } from "@/lib/datos/cuenta";
import { lempiras } from "@/lib/formato";
import { DEPARTAMENTOS, formatoTelefono, hayErrores, validarEnvio, zonaEnvio, type DatosEnvio, type Errores } from "@/lib/validacion";
import { useCarrito } from "./carrito-provider";

const tarjeta = "rounded-lg bg-bg p-[clamp(18px,3vw,28px)] shadow-1";

function Paso({ n, children, sub }: { n: number; children: React.ReactNode; sub?: string }) {
  return (
    <>
      <h2 className={`m-0 flex items-center gap-3 text-lg font-bold ${sub ? "mb-1.5" : "mb-5"}`}>
        <span className="flex size-7 items-center justify-center rounded-full bg-navy text-[13px] text-white">{n}</span>
        {children}
      </h2>
      {sub && <p className="mb-4 ml-10 mt-0 text-sm leading-normal text-text-2">{sub}</p>}
    </>
  );
}

function desdeDireccion(d: Direccion, correo: string): DatosEnvio {
  return {
    nombre: d.nombre,
    correo,
    telefono: formatoTelefono(d.telefono),
    departamento: d.departamento,
    ciudad: d.ciudad,
    colonia: d.colonia,
    direccion: d.direccion,
    referencia: d.referencia ?? "",
  };
}

export function FormularioCheckout({
  perfil,
  direcciones,
  conf,
}: {
  perfil: Perfil;
  direcciones: Direccion[];
  conf: Configuracion;
}) {
  const router = useRouter();
  const { lineas, subtotal, abrir, vaciar, avisar } = useCarrito();
  const predet = direcciones[0];
  const [elegida, setElegida] = useState<string | null>(predet?.id ?? null);
  const [datos, setDatos] = useState<DatosEnvio>(() =>
    predet
      ? desdeDireccion(predet, perfil.correo)
      : {
          nombre: perfil.nombre,
          correo: perfil.correo,
          telefono: perfil.telefono ? formatoTelefono(perfil.telefono) : "",
          departamento: "Cortés",
          ciudad: "",
          colonia: "",
          direccion: "",
          referencia: "",
        },
  );
  const [errores, setErrores] = useState<Errores<DatosEnvio>>({});
  const [error, setError] = useState<string | null>(null);
  const [guardar, setGuardar] = useState(direcciones.length === 0);
  const [enviando, iniciar] = useTransition();
  const [copiado, setCopiado] = useState<string | null>(null);

  const zona = zonaEnvio(datos.departamento, datos.ciudad);
  const envio = zona === "sps" ? conf.envioSps : conf.envioResto;
  const normal = perfil.tipoCliente === "normal";

  function cambiar<K extends keyof DatosEnvio>(k: K, v: string) {
    setDatos((d) => ({ ...d, [k]: v }));
    setElegida(null);
    if (errores[k])
      setErrores((prev) => {
        const resto = { ...prev };
        delete resto[k];
        return resto;
      });
  }

  function usarDireccion(d: Direccion) {
    setElegida(d.id);
    setDatos(desdeDireccion(d, datos.correo));
    setErrores({});
  }

  async function copiar(texto: string, etiqueta: string) {
    try {
      await navigator.clipboard.writeText(texto);
    } catch {}
    setCopiado(etiqueta);
    avisar(`${etiqueta} copiado`);
    setTimeout(() => setCopiado(null), 2000);
  }

  function confirmar() {
    setError(null);
    const e = validarEnvio(datos);
    setErrores(e);
    if (hayErrores(e)) {
      setError("Revisa los campos marcados.");
      return;
    }
    if (!lineas.length) {
      setError("Tu carrito está vacío.");
      return;
    }
    iniciar(async () => {
      const r = await crearPedido({
        items: lineas.map((l) => ({ varianteId: l.variante.id, cantidad: l.cantidad })),
        datos,
        guardarDireccion: guardar && !elegida,
      });
      if ("codigo" in r) {
        vaciar();
        router.push(`/pedidos/${r.codigo}/listo`);
      } else {
        setError(r.error);
        if (r.errores) setErrores(r.errores);
      }
    });
  }

  const campo = (k: keyof DatosEnvio, label: string, extra: Partial<React.ComponentProps<typeof Campo>> = {}) => (
    <Campo
      label={label}
      name={k}
      value={datos[k]}
      onChange={(e) => cambiar(k, e.target.value)}
      error={errores[k]}
      {...extra}
    />
  );

  return (
    <main className="bg-surface">
      <div className="mx-auto max-w-[1200px] px-[clamp(16px,3vw,40px)] pb-[clamp(48px,6vw,80px)] pt-6">
        <button type="button" onClick={abrir} className="inline-flex h-11 items-center gap-1.5 text-sm font-semibold">
          <ChevronLeft size={16} strokeWidth={2.25} aria-hidden />
          Volver al carrito
        </button>
        <h1 className="font-display text-h2 mb-6 mt-2">Finalizar compra</h1>

        <div className="grid grid-cols-1 items-start gap-6 min-[900px]:grid-cols-[minmax(0,1fr)_400px]">
          <div className="flex flex-col gap-4">
            <section className={tarjeta}>
              <Paso n={1}>Datos de contacto</Paso>
              <div className="grid grid-cols-1 gap-4 min-[900px]:grid-cols-2">
                {campo("nombre", "Nombre completo", { autoComplete: "name", placeholder: "María Fernanda Rápalo", className: "min-[900px]:col-span-2" })}
                {campo("correo", "Correo electrónico", { type: "email", inputMode: "email", autoComplete: "email", placeholder: "nombre@correo.com" })}
                {campo("telefono", "Teléfono", { type: "tel", inputMode: "numeric", autoComplete: "tel", placeholder: "9876-5432" })}
              </div>
            </section>

            <section className={tarjeta}>
              <Paso n={2}>Dirección de envío</Paso>
              {direcciones.length > 0 && (
                <div className="mb-5 flex flex-wrap gap-2" role="radiogroup" aria-label="Direcciones guardadas">
                  {direcciones.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      role="radio"
                      aria-checked={elegida === d.id}
                      onClick={() => usarDireccion(d)}
                      className={`flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold ${
                        elegida === d.id ? "bg-navy text-white" : "shadow-[inset_0_0_0_1.5px_var(--border)]"
                      }`}
                    >
                      <MapPin size={16} aria-hidden />
                      {d.etiqueta}
                    </button>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 min-[900px]:grid-cols-2">
                <Selector label="Departamento" name="departamento" value={datos.departamento} onChange={(e) => cambiar("departamento", e.target.value)} error={errores.departamento}>
                  {DEPARTAMENTOS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </Selector>
                {campo("ciudad", "Ciudad o municipio", { placeholder: "San Pedro Sula", autoComplete: "address-level2" })}
                {campo("colonia", "Colonia o barrio", { placeholder: "Col. Trejo" })}
                {campo("direccion", "Dirección", { placeholder: "Calle, avenida, número de casa", autoComplete: "street-address", className: "min-[900px]:col-span-2" })}
                {campo("referencia", "Punto de referencia", { opcional: true, placeholder: "Frente a…", className: "min-[900px]:col-span-2" })}
              </div>
              {!elegida && (
                <label className="mt-4 flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                  <input type="checkbox" checked={guardar} onChange={(e) => setGuardar(e.target.checked)} className="size-5 accent-[var(--navy)]" />
                  Guardar esta dirección para mis próximas compras
                </label>
              )}
            </section>

            <section className={tarjeta}>
              <Paso n={3} sub="Se calcula según tu dirección.">
                Costo de envío
              </Paso>
              <div className="grid grid-cols-1 gap-3 min-[900px]:grid-cols-2">
                {(
                  [
                    ["sps", "San Pedro Sula", "Entrega en 24 a 48 horas", conf.envioSps],
                    ["resto", "Resto del país", "De 2 a 4 días hábiles", conf.envioResto],
                  ] as const
                ).map(([z, titulo, sub, monto]) => (
                  <div
                    key={z}
                    className={`flex items-center gap-3 rounded-md p-4 ${zona === z ? "bg-navy-50 shadow-[inset_0_0_0_1.5px_var(--navy)]" : "bg-bg shadow-[inset_0_0_0_1.5px_var(--border)]"}`}
                  >
                    <span className={`flex size-[22px] flex-none items-center justify-center rounded-full bg-navy text-white ${zona === z ? "" : "opacity-0"}`}>
                      <Check size={16} strokeWidth={2.25} aria-hidden />
                    </span>
                    <div className="flex-1">
                      <div className="font-semibold">{titulo}</div>
                      <div className="text-[13px] text-text-2">{sub}</div>
                    </div>
                    <strong>{lempiras(monto)}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section className={tarjeta}>
              {normal ? (
                <>
                  <Paso n={4} sub="Transfiere el total a esta cuenta. Después de confirmar, sube tu comprobante.">
                    Pago por transferencia
                  </Paso>
                  <div className="rounded-md bg-surface px-4 py-1">
                    <div className="flex justify-between gap-3 border-b border-line py-3 text-sm">
                      <span className="text-text-2">Banco</span>
                      <strong>{conf.banco}</strong>
                    </div>
                    <div className="flex justify-between gap-3 border-b border-line py-3 text-sm">
                      <span className="text-text-2">Tipo</span>
                      <strong className="text-right">{conf.tipoCuenta}</strong>
                    </div>
                    {(
                      [
                        ["Número de cuenta", conf.numeroCuenta, conf.numeroCuenta.replace(/-/g, "")],
                        ["A nombre de", conf.titular, conf.titular],
                      ] as const
                    ).map(([etq, valor, aCopiar], i) => (
                      <div key={etq} className={`flex items-center justify-between gap-3 py-1.5 text-sm ${i === 0 ? "border-b border-line" : ""}`}>
                        <span className="text-text-2">{etq}</span>
                        <span className="flex items-center gap-1">
                          <strong className={i === 0 ? "text-base tracking-[.02em] tabular-nums" : ""}>{valor}</strong>
                          <button
                            type="button"
                            onClick={() => copiar(aCopiar, etq === "A nombre de" ? "Titular" : etq)}
                            className="flex h-11 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold hover:bg-navy-50"
                          >
                            {copiado === (etq === "A nombre de" ? "Titular" : etq) ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
                            Copiar
                          </button>
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <Paso n={4}>Forma de pago</Paso>
                  <p className="m-0 ml-10 leading-normal text-text-2">
                    {perfil.tipoCliente === "credito"
                      ? "Tu cuenta tiene crédito: el pedido se confirma de inmediato y se suma a tu saldo."
                      : "Pagas al recibir tu pedido, en efectivo o con tarjeta."}
                  </p>
                </>
              )}
            </section>
          </div>

          <aside className={`${tarjeta} flex flex-col gap-4 min-[900px]:sticky min-[900px]:top-[140px]`}>
            <h2 className="m-0 text-lg font-bold">Resumen del pedido</h2>
            {lineas.length === 0 && <p className="m-0 text-sm text-text-2">Tu carrito está vacío.</p>}
            <div className="flex flex-col gap-3">
              {lineas.map((l) => (
                <div key={l.slug + l.clave} className="flex items-center gap-3">
                  <div
                    className={`relative size-14 flex-none rounded-sm ${l.producto.tinte ? "bg-aroma-soft" : "bg-surface"}`}
                    style={{ "--aroma": l.producto.tinte ? aromaVar(l.variante.aroma ?? l.producto.tinte) : undefined } as React.CSSProperties}
                  >
                    <Image src={l.variante.img} alt="" fill sizes="56px" className="object-contain p-1.5" />
                    <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-navy px-[5px] text-[11px] font-bold text-white">
                      {l.cantidad}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold leading-[1.3]">{l.producto.nombre}</div>
                    <div className="text-[13px] text-text-2">
                      {l.variante.aroma ? `${AROMAS[l.variante.aroma]} · ` : ""}
                      {l.producto.tamano}
                    </div>
                  </div>
                  <div className="whitespace-nowrap text-sm font-semibold">{lempiras(l.total)}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2.5 border-t border-line pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-text-2">Subtotal</span>
                <span>{lempiras(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-2">Envío · {zona === "sps" ? "San Pedro Sula" : "Resto del país"}</span>
                <span>{lempiras(envio)}</span>
              </div>
              <div className="flex items-baseline justify-between pt-1.5">
                <span className="text-base font-bold">Total</span>
                <span className="text-[22px] font-bold">{lempiras(subtotal + envio)}</span>
              </div>
            </div>
            {error && <MensajeError>{error}</MensajeError>}
            {lineas.some((l) => l.variante.agotado) && (
              <div role="alert" className="flex items-start gap-2 rounded-md bg-warning-50 px-3.5 py-3 text-sm text-warning">
                <AlertTriangle size={16} className="mt-0.5 flex-none" aria-hidden />
                Algún producto de tu carrito se agotó. Quítalo para continuar.
              </div>
            )}
            <button
              type="button"
              onClick={confirmar}
              disabled={enviando || lineas.length === 0}
              className="flex h-[54px] items-center justify-center gap-2 rounded-full bg-navy font-semibold text-white transition-[background-color,transform] hover:bg-navy-700 active:scale-[.98] disabled:opacity-60"
            >
              {enviando ? "Creando tu pedido…" : "Confirmar pedido"}
            </button>
            <p className="m-0 text-center text-xs leading-normal text-text-2">
              {normal ? "Tu pedido queda en “Esperando pago” hasta que subas el comprobante." : "Tu pedido se confirma al instante."}
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
