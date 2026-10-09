/**
 * Supabase (PostgREST) devuelve como máximo 1000 filas por consulta y corta en silencio.
 * Para reportes y totales hay que traer todo: se pide por páginas de 1000 hasta agotar
 * (con un tope de seguridad). La consulta debe tener un orden estable (incluye el id).
 */
const PAGINA = 1000;

type Respuesta<T> = { data: T[] | null; error: { message: string } | null };

export async function todasLasFilas<T>(pedir: (desde: number, hasta: number) => PromiseLike<Respuesta<T>>, tope = 50_000): Promise<T[]> {
  const filas: T[] = [];
  for (let desde = 0; desde < tope; desde += PAGINA) {
    const { data, error } = await pedir(desde, desde + PAGINA - 1);
    if (error) throw new Error(error.message);
    filas.push(...(data ?? []));
    if (!data || data.length < PAGINA) break;
  }
  return filas;
}
