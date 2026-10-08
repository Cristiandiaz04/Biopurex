import { cacheLife, cacheTag } from "next/cache";
import { esAroma, type AromaId, type Categoria, type Insignia, type Producto } from "@/lib/catalogo";
import { clientePublico } from "@/lib/supabase/publico";
import { zonasActivas, type Municipio, type ZonasEnvio } from "@/lib/envio";

type FilaVariante = {
  id: string;
  clave: string;
  aroma_id: string | null;
  etiqueta: string;
  img: string;
  activo: boolean;
  orden: number;
};

type FilaProducto = {
  slug: string;
  codigo: string;
  categorias: { nombre: string; oscura: boolean } | null;
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
  const variantes = f.variantes
    .filter((v) => v.activo)
    .sort((a, b) => a.orden - b.orden)
    .map((v) => ({
      id: v.id,
      clave: v.clave,
      aroma: esAroma(v.aroma_id) ? v.aroma_id : null,
      etiqueta: v.etiqueta,
      img: v.img,
    }));
  if (!variantes.length) return null;
  return {
    slug: f.slug,
    codigo: f.codigo ?? "",
    lineaId: f.linea,
    nombre: f.nombre,
    nombreBase: f.nombre_base,
    tamano: f.tamano,
    cat: f.categoria_id,
    catNombre: f.categorias?.nombre ?? "",
    oscuro: f.categorias?.oscura ?? false,
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

  const columnas = (codigo: string) =>
    `slug, ${codigo}linea, nombre, nombre_base, tamano, categoria_id, categorias(nombre, oscura), precio, descripcion, beneficios, modo_uso, seguridad, cotizar, insignias, tinte, notas, variantes(id, clave, aroma_id, etiqueta, img, activo, orden)`;
  const consulta = (codigo: string) => clientePublico().from("productos").select(columnas(codigo)).eq("activo", true).order("orden");
  let { data, error } = await consulta("codigo, ");
  // Sin la migración 0008 todavía no existe productos.codigo: la tienda sigue funcionando sin código.
  if (error?.code === "42703") ({ data, error } = await consulta(""));
  if (error) throw new Error(`No se pudo cargar el catálogo: ${error.message}`);

  const productos = (data as unknown as FilaProducto[]).map(aProducto).filter((p): p is Producto => !!p);
  // Hermanos = otros tamaños de la misma línea, en el orden del catálogo.
  for (const p of productos) {
    p.hermanos = productos.filter((x) => x.lineaId === p.lineaId).map((x) => ({ slug: x.slug, tamano: x.tamano }));
  }
  return productos;
}

/** Categorías activas, en el orden de la tienda. Misma caché que el catálogo. */
export async function obtenerCategorias(): Promise<Categoria[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalogo");

  const sb = clientePublico();
  let { data, error } = await sb.from("categorias").select("id, numero, nombre, corto, img, tinte, oscura, activo").eq("activo", true).order("orden");
  // Sin la migración 0008 (numero, activo): se numeran por orden.
  if (error?.code === "42703") {
    const r = await sb.from("categorias").select("id, nombre, corto, img, tinte, oscura").order("orden");
    error = r.error;
    data = (r.data ?? []).map((c, i) => ({ ...c, numero: i + 1, activo: true }));
  }
  if (error) throw new Error(`No se pudieron cargar las categorías: ${error.message}`);
  return (data ?? []).map(aCategoria);
}

export const aCategoria = (c: Record<string, unknown>): Categoria => ({
  id: c.id as string,
  numero: Number(c.numero),
  nombre: c.nombre as string,
  corto: c.corto as string,
  img: (c.img as string) || null,
  tinte: esAroma(c.tinte) ? c.tinte : null,
  oscura: Boolean(c.oscura),
  activo: c.activo !== false,
});

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
    sb.from("municipios").select("id, departamento, nombre, costo_envio, activo").order("nombre"),
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
  }));
  return {
    municipios: zonasActivas(municipios),
    gratisDesde: c.data.envio_gratis_desde == null ? null : Number(c.data.envio_gratis_desde),
  };
}

// ---------------------------------------------------------------------------
// Inicio: secciones de productos editables desde el panel (0011)
// ---------------------------------------------------------------------------

export type ModoSeccion = "manual" | "mas_vendidos" | "nuevos";
/** "productos" = fila de tarjetas; las otras son bloques fijos del diseño que se pueden ocultar u ordenar. */
export type TipoSeccion = "productos" | "estrella" | "categorias" | "aromas";
export type SeccionInicio = {
  id: string;
  tipo: TipoSeccion;
  titulo: string;
  descripcion: string | null;
  tema: "claro" | "oscuro";
  categoriaId: string | null;
  /** Tarjetas a mostrar: producto + aroma (clave de la variante). */
  items: { slug: string; clave: string }[];
};

/** Lo que mostraba el inicio antes de que existieran las secciones (sin la migración 0011). */
const INICIO_ANTERIOR = [
  { titulo: "Más vendidos", descripcion: null, tema: "claro" as const, categoriaId: null, slugs: ["desinfectante-galon", "biowash", "jabon-manos", "biosoft"] },
  {
    titulo: "Línea automotriz",
    descripcion: "Shampoo, abrillantadores y desengrasantes para tu vehículo o tu carwash, en 740 ml, galón y 20 litros.",
    tema: "oscuro" as const,
    categoriaId: "auto",
    slugs: ["biofoam-galon", "shampoo-carros-galon", "llantas-galon", "tableros-galon"],
  },
];

/** Secciones activas del inicio con sus tarjetas ya resueltas. Misma caché que el catálogo. */
export async function obtenerInicio(): Promise<SeccionInicio[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalogo");

  const productos = await obtenerProductos();
  const porVariante = new Map(productos.flatMap((p) => p.variantes.map((v) => [v.id, { slug: p.slug, clave: v.clave }] as const)));
  const sb = clientePublico();
  const { data, error } = await sb
    .from("inicio_secciones")
    .select("id, titulo, descripcion, modo, cantidad, tema, categoria_id, inicio_productos(variante_id, orden)")
    .eq("activa", true)
    .order("orden");

  if (error) {
    console.error("[obtenerInicio]", error.message);
    return [...FIJAS_ANTERIOR, ...INICIO_ANTERIOR.map((s, i) => ({
      id: `anterior-${i}`,
      tipo: "productos" as const,
      ...s,
      items: s.slugs.flatMap((slug) => {
        const p = productos.find((x) => x.slug === slug);
        return p ? [{ slug, clave: p.variantes[0].clave }] : [];
      }),
    }))];
  }

  const necesitaVentas = data.some((s) => s.modo === "mas_vendidos");
  const sinFijas = !data.some((s) => ["estrella", "categorias", "aromas"].includes(s.modo as string));
  const ventas = necesitaVentas ? ((await sb.rpc("inicio_mas_vendidos", { p_limite: 24 })).data ?? []) : [];

  const secciones: SeccionInicio[] = data
    .map((s) => {
      const tipo: TipoSeccion = s.modo === "estrella" || s.modo === "categorias" || s.modo === "aromas" ? s.modo : "productos";
      let items: { slug: string; clave: string }[] = [];
      if (tipo !== "productos") {
        // Bloque fijo: no lleva tarjetas.
      } else if (s.modo === "manual") {
        items = (s.inicio_productos as { variante_id: string; orden: number }[])
          .sort((a, b) => a.orden - b.orden)
          .flatMap((x) => {
            const v = porVariante.get(x.variante_id);
            return v ? [v] : [];
          });
      } else if (s.modo === "mas_vendidos") {
        items = (ventas as { variante_id: string }[]).flatMap((x) => {
          const v = porVariante.get(x.variante_id);
          return v ? [v] : [];
        });
      } else {
        // Nuevos: productos marcados como "Nuevo" (una tarjeta por producto).
        items = productos.filter((p) => p.insignias.includes("nuevo")).map((p) => ({ slug: p.slug, clave: p.variantes[0].clave }));
      }
      return {
        id: s.id as string,
        tipo,
        titulo: s.titulo as string,
        descripcion: (s.descripcion as string) ?? null,
        tema: s.tema === "oscuro" ? ("oscuro" as const) : ("claro" as const),
        categoriaId: (s.categoria_id as string) ?? null,
        items: items.slice(0, s.cantidad as number),
      };
    })
    .filter((s) => s.tipo !== "productos" || s.items.length > 0);
  return sinFijas ? [...FIJAS_ANTERIOR, ...secciones] : secciones;
}

const FIJAS_ANTERIOR: SeccionInicio[] = (["estrella", "categorias", "aromas"] as const).map((tipo) => ({
  id: `fija-${tipo}`,
  tipo,
  titulo: tipo === "categorias" ? "Categorías" : tipo === "aromas" ? "Explora por aroma" : "Producto estrella",
  descripcion: null,
  tema: "claro",
  categoriaId: null,
  items: [],
}));
