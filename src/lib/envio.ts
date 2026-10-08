/*
 * Zonas de entrega (municipios y ciudades que define el admin) y costo de envío.
 * Mismas reglas que _crear_pedido en la base de datos (0007), que es la que decide al final.
 */

export type Ciudad = { id: string; nombre: string; activo: boolean };
export type Municipio = { id: string; departamento: string; nombre: string; costo: number; activo: boolean; ciudades: Ciudad[] };
export type ZonasEnvio = { municipios: Municipio[]; gratisDesde: number | null };

const igual = (a: string, b: string) => a.trim().toLocaleLowerCase("es") === b.trim().toLocaleLowerCase("es");

/** Solo lo que el cliente puede elegir: municipios activos con al menos una ciudad activa. */
export function zonasActivas(municipios: Municipio[]): Municipio[] {
  return municipios
    .filter((m) => m.activo)
    .map((m) => ({ ...m, ciudades: m.ciudades.filter((c) => c.activo) }))
    .filter((m) => m.ciudades.length > 0);
}

export const departamentosConEntrega = (municipios: Municipio[]) => [...new Set(zonasActivas(municipios).map((m) => m.departamento))].sort((a, b) => a.localeCompare(b, "es"));

/**
 * Busca la zona de una dirección. Sin municipio (direcciones guardadas antes de las zonas) se deduce
 * por la ciudad. Devuelve los nombres tal como están en la lista, o null si no se entrega ahí.
 */
export function resolverZona(municipios: Municipio[], departamento: string, municipio: string, ciudad: string) {
  for (const m of zonasActivas(municipios)) {
    if (m.departamento !== departamento) continue;
    if (municipio.trim() && !igual(m.nombre, municipio)) continue;
    const c = m.ciudades.find((x) => igual(x.nombre, ciudad));
    if (c) return { municipio: m, ciudad: c.nombre };
  }
  return null;
}

/** Envío gratis cuando la compra es MAYOR que el mínimo configurado. */
export function costoEnvio(costoMunicipio: number, subtotal: number, gratisDesde: number | null) {
  return gratisDesde != null && subtotal > gratisDesde ? 0 : costoMunicipio;
}

/** Cuánto falta para llegar al mínimo del envío gratis (hay que pasarlo; null si no aplica o ya es gratis). */
export function faltaParaGratis(subtotal: number, gratisDesde: number | null) {
  if (gratisDesde == null || subtotal > gratisDesde) return null;
  return Math.round((gratisDesde - subtotal) * 100) / 100;
}
