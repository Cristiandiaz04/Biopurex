/*
 * Zonas de entrega (municipios que define el admin) y costo de envío.
 * Mismas reglas que _crear_pedido en la base de datos (0010), que es la que decide al final.
 * El cliente elige el municipio de la lista y escribe su ciudad, aldea o caserío.
 */

export type Municipio = { id: string; departamento: string; nombre: string; costo: number; activo: boolean };
export type ZonasEnvio = { municipios: Municipio[]; gratisDesde: number | null };

const igual = (a: string, b: string) => a.trim().toLocaleLowerCase("es") === b.trim().toLocaleLowerCase("es");

/** Solo lo que el cliente puede elegir: municipios activos. */
export const zonasActivas = (municipios: Municipio[]) => municipios.filter((m) => m.activo);

export const departamentosConEntrega = (municipios: Municipio[]) => [...new Set(zonasActivas(municipios).map((m) => m.departamento))].sort((a, b) => a.localeCompare(b, "es"));

/**
 * Municipio de una dirección (con el nombre tal como está en la lista), o null si no se entrega ahí.
 * Sin municipio (direcciones guardadas antes) se prueba con la ciudad.
 */
export function resolverZona(municipios: Municipio[], departamento: string, municipio: string, ciudad: string): Municipio | null {
  const buscado = municipio.trim() || ciudad;
  return zonasActivas(municipios).find((m) => m.departamento === departamento && igual(m.nombre, buscado)) ?? null;
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
