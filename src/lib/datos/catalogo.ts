import { cacheLife, cacheTag } from "next/cache";
import { esAroma, esCategoria, type AromaId, type Insignia, type Producto } from "@/lib/catalogo";
import { clientePublico } from "@/lib/supabase/publico";
import { zonasActivas, type Municipio, type ZonasEnvio } from "@/lib/envio";

type FilaVariante = {
  id: string;
  clave: string;
  aroma_id: string | null;
  etiqueta: string;
  img: string;
  disponible: boolean;
  activo: boolean;
  orden: number;
};

type FilaProducto = {
  slug: string;
  linea: string;
  nombre: string;
  nombre_base: string;
  tamano: string;
  categoria_id: string;
  precio: number | string | null;
  descripcion: string;
  beneficios: string[];
  modo_uso: string[];
  seguridad: boolean;
  cotizar: boolean;
  insignias: string[];
  tinte: string | null;
  notas: Record<string, string>;
  variantes: FilaVariante[];
};

function aProducto(f: FilaProducto): Producto | null {
  if (!esCategoria(f.categoria_id)) return null;
  const variantes = f.variantes
    .filter((v) => v.activo)
    .sort((a, b) => a.orden - b.orden)
    .map((v) => ({
      id: v.id,
      clave: v.clave,
      aroma: esAroma(v.aroma_id) ? v.aroma_id : null,
      etiqueta: v.etiqueta,
      img: v.img,
      agotado: !v.disponible,
    }));
  if (!variantes.length) return null;
  return {
    slug: f.slug,
    lineaId: f.linea,
    nombre: f.nombre,
    nombreBase: f.nombre_base,
    tamano: f.tamano,
    cat: f.categoria_id,
    precio: f.precio == null ? null : Number(f.precio),
    desc: f.descripcion,
    beneficios: f.beneficios,
    modoUso: f.modo_uso,
    seguridad: f.seguridad,
    cotizar: f.cotizar,
    insignias: f.insignias.filter((i): i is Insignia => i === "mas" || i === "nuevo"),
    tinte: esAroma(f.tinte) ? f.tinte : null,
    notas: Object.fromEntries(Object.entries(f.notas ?? {}).filter(([k]) => esAroma(k))) as Partial<Record<AromaId, string>>,
    variantes,
    hermanos: [],
  };
}

/**
 * Catálogo completo (productos activos con sus variantes). Cacheado: se refresca cada minuto
 * o al invalidar la etiqueta "catalogo" (panel admin). La disponibilidad real se valida al pagar.
 */
export async function obtenerProductos(): Promise<Producto[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalogo");

  const { data, error } = await clientePublico()
    .from("productos")
    .select(
      "slug, linea, nombre, nombre_base, tamano, categoria_id, precio, descripcion, beneficios, modo_uso, seguridad, cotizar, insignias, tinte, notas, variantes(id, clave, aroma_id, etiqueta, img, disponible, activo, orden)",
    )
    .eq("activo", true)
    .order("orden");
  if (error) throw new Error(`No se pudo cargar el catálogo: ${error.message}`);

  const productos = (data as FilaProducto[]).map(aProducto).filter((p): p is Producto => !!p);
  // Hermanos = otros tamaños de la misma línea, en el orden del catálogo.
  for (const p of productos) {
    p.hermanos = productos.filter((x) => x.lineaId === p.lineaId).map((x) => ({ slug: x.slug, tamano: x.tamano }));
  }
  return productos;
}

export type Configuracion = {
  banco: string;
  tipoCuenta: string;
  numeroCuenta: string;
  titular: string;
};

export async function obtenerConfiguracion(): Promise<Configuracion> {
  "use cache";
  cacheLife("hours");
  cacheTag("configuracion");

  const { data, error } = await clientePublico()
    .from("configuracion")
    .select("banco, tipo_cuenta, numero_cuenta, titular")
    .single();
  if (error) throw new Error(`No se pudo cargar la configuración: ${error.message}`);
  return {
    banco: data.banco,
    tipoCuenta: data.tipo_cuenta,
    numeroCuenta: data.numero_cuenta,
    titular: data.titular,
  };
}

/** Municipios y ciudades donde se entrega (los que el cliente puede elegir) y el mínimo del envío gratis. */
export async function obtenerZonas(): Promise<ZonasEnvio> {
  "use cache";
  cacheLife("minutes");
  cacheTag("zonas");

  const sb = clientePublico();
  const [m, c] = await Promise.all([
    sb.from("municipios").select("id, departamento, nombre, costo_envio, activo, ciudades(id, nombre, activo)").order("nombre"),
    sb.from("configuracion").select("envio_gratis_desde").single(),
  ]);
  // Sin la migración 0007 la tienda sigue abierta, pero sin zonas no se puede confirmar un pedido.
  if (m.error || c.error) {
    console.error("[obtenerZonas]", m.error?.message ?? c.error?.message);
    return { municipios: [], gratisDesde: null };
  }
  const municipios: Municipio[] = m.data.map((x) => ({
    id: x.id,
    departamento: x.departamento,
    nombre: x.nombre,
    costo: Number(x.costo_envio),
    activo: x.activo,
    ciudades: (x.ciudades as { id: string; nombre: string; activo: boolean }[]).sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
  }));
  return {
    municipios: zonasActivas(municipios),
    gratisDesde: c.data.envio_gratis_desde == null ? null : Number(c.data.envio_gratis_desde),
  };
}
