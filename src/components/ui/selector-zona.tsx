"use client";

import { Campo, Selector } from "@/components/ui/campo";
import { departamentosConEntrega, resolverZona, type Municipio } from "@/lib/envio";

type Zona = { departamento: string; municipio: string; ciudad: string };

/**
 * Departamento (fijo si solo hay uno: Cortés) → municipio de la lista del admin (obligatorio)
 * → ciudad, aldea o caserío escrito por el cliente.
 */
export function SelectorZona({
  municipios,
  valor,
  onChange,
  errores = {},
}: {
  municipios: Municipio[];
  valor: Zona;
  onChange: (z: Zona) => void;
  errores?: Partial<Record<keyof Zona, string>>;
}) {
  const departamentos = departamentosConEntrega(municipios);
  const delDepto = municipios.filter((m) => m.departamento === valor.departamento);
  const elegido = delDepto.some((m) => m.nombre === valor.municipio) ? valor.municipio : "";

  if (!departamentos.length) {
    return (
      <p role="alert" className="m-0 rounded-md bg-warning-50 px-3.5 py-3 text-sm text-warning min-[900px]:col-span-2">
        Por el momento no hay zonas de entrega disponibles. Escríbenos para coordinar tu pedido.
      </p>
    );
  }

  return (
    <>
      <Selector
        label="Departamento"
        name="departamento"
        value={departamentos.includes(valor.departamento) ? valor.departamento : ""}
        onChange={(e) => onChange({ ...valor, departamento: e.target.value, municipio: "" })}
        disabled={departamentos.length === 1}
        error={errores.departamento}
      >
        <option value="" disabled>
          Elige…
        </option>
        {departamentos.map((d) => (
          <option key={d}>{d}</option>
        ))}
      </Selector>
      <Selector label="Municipio" name="municipio" value={elegido} onChange={(e) => onChange({ ...valor, municipio: e.target.value })} disabled={!delDepto.length} required error={errores.municipio}>
        <option value="" disabled>
          Elige tu municipio…
        </option>
        {delDepto.map((m) => (
          <option key={m.id}>{m.nombre}</option>
        ))}
      </Selector>
      <Campo
        label="Ciudad, aldea o caserío"
        name="ciudad"
        value={valor.ciudad}
        onChange={(e) => onChange({ ...valor, ciudad: e.target.value })}
        maxLength={80}
        placeholder="Ej.: San Pedro Sula, Aldea El Carmen"
        autoComplete="address-level2"
        error={errores.ciudad}
      />
    </>
  );
}

/** Lleva una dirección guardada a la lista de municipios; si el municipio ya no está, queda por elegir. */
export function zonaDeDireccion(municipios: Municipio[], d: Zona): Zona & { fuera: boolean } {
  const m = resolverZona(municipios, d.departamento, d.municipio, d.ciudad);
  if (m) return { departamento: m.departamento, municipio: m.nombre, ciudad: d.ciudad, fuera: false };
  return { ...zonaInicial(municipios), ciudad: d.ciudad, fuera: true };
}

/** Zona inicial para un formulario nuevo: el departamento ya viene elegido si solo hay uno. */
export function zonaInicial(municipios: Municipio[]): Zona {
  const deptos = departamentosConEntrega(municipios);
  const departamento = deptos.length === 1 ? deptos[0] : "";
  const ms = municipios.filter((m) => m.departamento === departamento);
  return { departamento, municipio: ms.length === 1 ? ms[0].nombre : "", ciudad: "" };
}
