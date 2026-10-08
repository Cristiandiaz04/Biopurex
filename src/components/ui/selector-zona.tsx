"use client";

import { Selector } from "@/components/ui/campo";
import { departamentosConEntrega, resolverZona, type Municipio } from "@/lib/envio";

type Zona = { departamento: string; municipio: string; ciudad: string };

/**
 * Departamento → municipio → ciudad, solo de la lista que define el admin (no se escribe a mano).
 * Si hay una sola opción se elige sola.
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
  const muni = delDepto.find((m) => m.nombre === valor.municipio);
  const ciudades = muni?.ciudades ?? [];

  // Al cambiar un nivel, el siguiente se elige solo cuando hay una sola opción.
  const elegirDepto = (departamento: string) => {
    const ms = municipios.filter((m) => m.departamento === departamento);
    const m = ms.length === 1 ? ms[0] : undefined;
    onChange({ departamento, municipio: m?.nombre ?? "", ciudad: m?.ciudades.length === 1 ? m.ciudades[0].nombre : "" });
  };
  const elegirMuni = (municipio: string) => {
    const m = delDepto.find((x) => x.nombre === municipio);
    onChange({ ...valor, municipio, ciudad: m?.ciudades.length === 1 ? m.ciudades[0].nombre : "" });
  };

  if (!departamentos.length) {
    return (
      <p role="alert" className="m-0 rounded-md bg-warning-50 px-3.5 py-3 text-sm text-warning min-[900px]:col-span-2">
        Por el momento no hay zonas de entrega disponibles. Escríbenos para coordinar tu pedido.
      </p>
    );
  }

  return (
    <>
      <Selector label="Departamento" name="departamento" value={departamentos.includes(valor.departamento) ? valor.departamento : ""} onChange={(e) => elegirDepto(e.target.value)} error={errores.departamento}>
        <option value="" disabled>
          Elige…
        </option>
        {departamentos.map((d) => (
          <option key={d}>{d}</option>
        ))}
      </Selector>
      <Selector label="Municipio" name="municipio" value={muni ? muni.nombre : ""} onChange={(e) => elegirMuni(e.target.value)} disabled={!delDepto.length} error={errores.municipio}>
        <option value="" disabled>
          Elige…
        </option>
        {delDepto.map((m) => (
          <option key={m.id}>{m.nombre}</option>
        ))}
      </Selector>
      <Selector label="Ciudad" name="ciudad" value={ciudades.some((c) => c.nombre === valor.ciudad) ? valor.ciudad : ""} onChange={(e) => onChange({ ...valor, ciudad: e.target.value })} disabled={!ciudades.length} error={errores.ciudad}>
        <option value="" disabled>
          Elige…
        </option>
        {ciudades.map((c) => (
          <option key={c.id}>{c.nombre}</option>
        ))}
      </Selector>
    </>
  );
}

/** Lleva una dirección guardada a la lista de zonas (nombres exactos); vacía lo que no está en la lista. */
export function zonaDeDireccion(municipios: Municipio[], d: Zona): Zona & { fuera: boolean } {
  const z = resolverZona(municipios, d.departamento, d.municipio, d.ciudad);
  if (z) return { departamento: d.departamento, municipio: z.municipio.nombre, ciudad: z.ciudad, fuera: false };
  return { ...zonaInicial(municipios), fuera: true };
}

/** Zona inicial para un formulario nuevo: si solo hay una opción, ya viene elegida. */
export function zonaInicial(municipios: Municipio[]): Zona {
  const deptos = departamentosConEntrega(municipios);
  const departamento = deptos.length === 1 ? deptos[0] : "";
  const ms = municipios.filter((m) => m.departamento === departamento);
  const m = ms.length === 1 ? ms[0] : undefined;
  return { departamento, municipio: m?.nombre ?? "", ciudad: m?.ciudades.length === 1 ? m.ciudades[0].nombre : "" };
}
