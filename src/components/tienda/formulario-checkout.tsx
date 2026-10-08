"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertTriangle, ChevronLeft, Copy, Check, Tag, Truck, X } from "lucide-react";
import { crearPedido, validarCodigo } from "@/acciones/checkout";
import { Campo, MensajeError, Selector } from "@/components/ui/campo";
import { SelectorZona, zonaDeDireccion, zonaInicial } from "@/components/ui/selector-zona";
import { AROMAS, aromaVar } from "@/lib/catalogo";
import type { Configuracion } from "@/lib/datos/catalogo";
import type { Direccion, Perfil } from "@/lib/datos/cuenta";
import { costoEnvio, faltaParaGratis, resolverZona, type Municipio, type ZonasEnvio } from "@/lib/envio";
import { lempiras } from "@/lib/formato";
import { formatoTelefono, hayErrores, validarEnvio, type DatosEnvio, type Errores } from "@/lib/validacion";
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

function desdeDireccion(d: Direccion, correo: string, municipios: Municipio[]): DatosEnvio {
  const z = zonaDeDireccion(municipios, { departamento: d.departamento, municipio: d.municipio ?? "", ciudad: d.ciudad });
  return {
    nombre: d.nombre,
    correo,
    telefono: formatoTelefono(d.telefono),
    departamento: z.departamento,
    municipio: z.municipio,
    ciudad: z.ciudad,
    colonia: d.colonia,
    direccion: d.direccion,
    referencia: d.referencia ?? "",
  };
}

export function FormularioCheckout({
  perfil,
  direcciones,
  conf,
  zonas,
}: {
  perfil: Perfil;
  direcciones: Direccion[];
  conf: Configuracion;
  zonas: ZonasEnvio;
}) {
  const { municipios, gratisDesde } = zonas;
  const router = useRouter();
  const { lineas, subtotal, abrir, vaciar, avisar } = useCarrito();
  const predet = direcciones[0];
  const [elegida, setElegida] = useState<string | null>(predet?.id ?? null);
  const [datos, setDatos] = useState<DatosEnvio>(() =>
    predet
      ? desdeDireccion(predet, perfil.correo, municipios)
      : {
          nombre: perfil.nombre,
          correo: perfil.correo,
          telefono: perfil.telefono ? formatoTelefono(perfil.telefono) : "",
          ...zonaInicial(municipios),
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
  const [codigoTexto, setCodigoTexto] = useState("");
  const [cupon, setCupon] = useState<{ codigo: string; porcentaje: number } | null>(null);
  const [errorCupon, setErrorCupon] = useState<string | null>(null);
  const [validando, iniciarValidacion] = useTransition();

  const zona = resolverZona(municipios, datos.departamento, datos.municipio, datos.ciudad);
  const envio = zona && lineas.length ? costoEnvio(zona.costo, subtotal, gratisDesde) : null;
  const falta = faltaParaGratis(subtotal, gratisDesde);
  const guardada = direcciones.find((x) => x.id === elegida);
  const elegidaFuera = guardada
    ? zonaDeDireccion(municipios, { departamento: guardada.departamento, municipio: guardada.municipio ?? "", ciudad: guardada.ciudad }).fuera
    : false;
  const normal = perfil.tipoCliente === "normal";
  const descuento = cupon ? Math.round(subtotal * cupon.porcentaje) / 100 : 0;
  const total = subtotal - descuento + (envio ?? 0);

  function aplicarCodigo() {
    setErrorCupon(null);
    iniciarValidacion(async () => {
      const r = await validarCodigo(codigoTexto, subtotal);
      if ("error" in r) {
        setCupon(null);
        setErrorCupon(r.error);
      } else setCupon(r);
    });
  }

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

  function usarDireccion(id: string) {
    const d = direcciones.find((x) => x.id === id);
    setErrores({});
    if (d) {
      setElegida(d.id);
      setDatos(desdeDireccion(d, datos.correo, municipios));
    } else {
      // "Otra dirección": se conservan los datos de contacto y se limpia la dirección.
      setElegida(null);
      setDatos((x) => ({ ...x, ...zonaInicial(municipios), colonia: "", direccion: "", referencia: "" }));
    }
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
        codigo: cupon?.codigo ?? null,
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
                <Selector
                  label="Seleccionar dirección establecida"
                  name="direccion-guardada"
                  value={elegida ?? "nueva"}
                  onChange={(e) => usarDireccion(e.target.value)}
                  className="mb-5"
                >
                  {direcciones.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.etiqueta} — {d.direccion}, {d.colonia}, {d.ciudad}
                    </option>
                  ))}
                  <option value="nueva">Otra dirección…</option>
                </Selector>
              )}
              {elegidaFuera && (
                <div role="alert" className="mb-4 flex items-start gap-2 rounded-md bg-warning-50 px-3.5 py-3 text-sm text-warning">
                  <AlertTriangle size={16} className="mt-0.5 flex-none" aria-hidden />
                  Esa dirección está fuera de nuestra zona de entrega. Elige tu municipio de la lista.
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 min-[900px]:grid-cols-2">
                <SelectorZona
                  municipios={municipios}
                  valor={{ departamento: datos.departamento, municipio: datos.municipio, ciudad: datos.ciudad }}
                  onChange={(z) => {
                    setDatos((d) => ({ ...d, ...z }));
                    setElegida(null);
                    setErrores((prev) => {
                      const resto = { ...prev };
                      delete resto.departamento;
                      delete resto.municipio;
                      delete resto.ciudad;
                      return resto;
                    });
                  }}
                  errores={errores}
                />
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
              <Paso n={3} sub="Se calcula según tu municipio.">
                Costo de envío
              </Paso>
              <div className={`flex items-center gap-3 rounded-md p-4 ${zona ? "bg-navy-50 shadow-[inset_0_0_0_1.5px_var(--navy)]" : "bg-bg shadow-[inset_0_0_0_1.5px_var(--border)]"}`}>
                <span className="flex size-10 flex-none items-center justify-center rounded-full bg-navy text-white">
                  <Truck size={20} aria-hidden />
                </span>
                <div className="flex-1">
                  <div className="font-semibold">{zona ? `${zona.nombre}, ${zona.departamento}` : "Elige tu municipio"}</div>
                  <div className="text-[13px] text-text-2">Entrega en 24 a 48 horas</div>
                </div>
                <strong className={envio === 0 ? "text-success" : ""}>{envio == null ? "—" : envio === 0 ? "Gratis" : lempiras(envio)}</strong>
              </div>
              {gratisDesde != null && (
                <p className="mb-0 mt-3 text-sm leading-normal text-text-2">
                  {falta == null ? (
                    <strong className="text-success">Tu compra pasa de {lempiras(gratisDesde)}: el envío es gratis.</strong>
                  ) : (
                    <>Envío gratis en compras de más de {lempiras(gratisDesde)}. Te faltan {lempiras(falta)} o más.</>
                  )}
                </p>
              )}
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
                <span className="text-text-2">Envío{zona ? ` · ${zona.nombre}` : ""}</span>
                <span className={envio === 0 ? "font-semibold text-success" : ""}>{envio == null ? "—" : envio === 0 ? "Gratis" : lempiras(envio)}</span>
              </div>
              {cupon && (
                <div className="flex justify-between text-success">
                  <span>
                    Descuento {cupon.codigo} ({cupon.porcentaje} %)
                  </span>
                  <span>−{lempiras(descuento)}</span>
                </div>
              )}
              <div className="flex items-baseline justify-between pt-1.5">
                <span className="text-base font-bold">Total</span>
                <span className="text-[22px] font-bold">{lempiras(total)}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 border-t border-line pt-4">
              <span className="flex items-center gap-1.5 text-sm font-semibold">
                <Tag size={16} aria-hidden />
                Código de descuento
              </span>
              {cupon ? (
                <div className="flex items-center justify-between gap-2 rounded-md bg-success-50 px-3.5 py-2.5 text-sm font-semibold text-success">
                  {cupon.codigo} · {cupon.porcentaje} % aplicado
                  <button type="button" onClick={() => { setCupon(null); setCodigoTexto(""); }} aria-label="Quitar código" className="flex size-8 items-center justify-center rounded-full hover:bg-white">
                    <X size={16} aria-hidden />
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    aplicarCodigo();
                  }}
                  className="flex gap-2"
                >
                  <input
                    value={codigoTexto}
                    onChange={(e) => setCodigoTexto(e.target.value.toUpperCase())}
                    placeholder="Ej.: MAYOREO10"
                    aria-label="Código de descuento"
                    maxLength={30}
                    className="h-11 min-w-0 flex-1 rounded-md border-[1.5px] border-line px-3.5 text-sm uppercase text-navy outline-none focus:border-navy"
                  />
                  <button type="submit" disabled={validando || !codigoTexto.trim()} className="h-11 rounded-full px-4 text-sm font-semibold shadow-[inset_0_0_0_1.5px_var(--navy)] disabled:opacity-50">
                    {validando ? "…" : "Aplicar"}
                  </button>
                </form>
              )}
              {errorCupon && <span className="text-[13px] font-medium text-error">{errorCupon}</span>}
            </div>
            {error && <MensajeError>{error}</MensajeError>}
            <button
              type="button"
              onClick={confirmar}
              disabled={enviando || lineas.length === 0 || !zona}
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
