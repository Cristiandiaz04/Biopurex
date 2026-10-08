/*
 * Catálogo de BIOPUREX — tipos, constantes y helpers puros.
 * Modelo (decisión de Cristian, 2026-10-08): cada TAMAÑO es un producto distinto y se muestra
 * como tarjeta aparte; dentro de cada producto, los AROMAS son las variantes.
 * Los datos viven en Supabase (tablas productos / variantes). La semilla inicial sale de
 * scripts/semilla/lineas.ts → supabase/migrations/0002_catalogo_inicial.sql.
 */

export type AromaId =
  | "lavanda"
  | "citronella"
  | "manzanacanela"
  | "limon"
  | "pino"
  | "manzanaverde"
  | "cereza"
  | "fresh"
  | "passionfruit"
  | "espuma"
  | "sweetfusion"
  | "sunnypop"
  | "sweettouch"
  | "uva"
  | "mandarina"
  | "vainilla"
  | "carronuevo";

export const AROMAS: Record<AromaId, string> = {
  lavanda: "Lavanda",
  citronella: "Citronella",
  manzanacanela: "Manzana Canela",
  limon: "Limón",
  pino: "Pino",
  manzanaverde: "Manzana Verde",
  cereza: "Cereza",
  fresh: "Fresh",
  passionfruit: "Passionfruit",
  espuma: "Espuma Limpiadora",
  sweetfusion: "Sweet Fusion",
  sunnypop: "Sunny Pop",
  sweettouch: "Sweet Touch",
  uva: "Uva",
  mandarina: "Mandarina",
  vainilla: "Vainilla",
  carronuevo: "Carro Nuevo",
};

/** Colores de aroma (mismos valores que globals.css; se usan en la semilla de la BD). */
export const COLOR_AROMA: Record<AromaId, string> = {
  lavanda: "#7B4FC9",
  citronella: "#F2C230",
  manzanacanela: "#C8202F",
  limon: "#C9D62B",
  pino: "#2E8B3A",
  manzanaverde: "#8CC63F",
  cereza: "#D7263D",
  fresh: "#4FB3E8",
  passionfruit: "#8E3FA8",
  espuma: "#2A9DB5",
  sweetfusion: "#E0457B",
  sunnypop: "#6CC3E8",
  sweettouch: "#EE8FB5",
  uva: "#6B3FA0",
  mandarina: "#F28C28",
  vainilla: "#E8C07A",
  carronuevo: "#8A94A6",
};

export const AROMA_IDS = Object.keys(AROMAS) as AromaId[];

export const esAroma = (a: unknown): a is AromaId => typeof a === "string" && a in AROMAS;

export const aromaVar = (a: AromaId) => `var(--aroma-${a})`;

/** Las categorías viven en la BD (el admin las crea). El id es un slug: "hogar", "lavanderia"… */
export type CategoriaId = string;

export type Categoria = {
  id: CategoriaId;
  /** 1–99: prefijo del código de sus productos (01 → 010001, 010002…). */
  numero: number;
  nombre: string;
  corto: string;
  /** Imagen de la tarjeta en el inicio (nombre en /img, sin extensión); si no hay, la de un producto. */
  img: string | null;
  tinte: AromaId | null;
  oscura: boolean;
  activo: boolean;
};

/** 1 → "01" */
export const prefijoCategoria = (numero: number) => String(numero).padStart(2, "0");

export type Insignia = "mas" | "nuevo";

export const AVISO_SEGURIDAD = [
  "Manténgase fuera del alcance de los niños.",
  "No mezclar con otros productos químicos, especialmente amoníaco o ácidos.",
  "Usa guantes y evita el contacto con ojos y piel; en caso de contacto, enjuaga con abundante agua.",
  "Almacena en un lugar fresco y ventilado, lejos de la luz solar.",
];

/** Tamaños que aparecen como filtro "Presentación" en el catálogo. */
export const TAMANOS_FILTRO = ["740 ml", "Litro", "Galón", "20 L", "Spray"];

export type Variante = {
  /** id de la fila en la BD (variantes.id). */
  id: string;
  /** Clave única dentro del producto: el aroma, o "unica" si no tiene. */
  clave: string;
  aroma: AromaId | null;
  etiqueta: string;
  img: string;
};

export type Producto = {
  slug: string;
  /** Código interno: categoría (2 dígitos) + correlativo (4 dígitos). */
  codigo: string;
  lineaId: string;
  nombre: string;
  nombreBase: string;
  tamano: string;
  cat: CategoriaId;
  catNombre: string;
  /** La categoría usa el tema oscuro (línea automotriz). */
  oscuro: boolean;
  precio: number | null;
  desc: string;
  beneficios: string[];
  modoUso: string[];
  seguridad: boolean;
  cotizar: boolean;
  insignias: Insignia[];
  tinte: AromaId | null;
  notas: Partial<Record<AromaId, string>>;
  variantes: Variante[];
  /** Presentaciones hermanas (otros tamaños de la misma línea), incluida esta. */
  hermanos: { slug: string; tamano: string }[];
};

export const esOscuro = (p: Producto) => p.oscuro;

export const esMayoreo = (p: Producto) => p.tamano === "20 L" || p.cotizar;

/** Variante inicial: la pedida (si existe), si no la primera. */
export function varianteInicial(p: Producto, clave?: string | null) {
  return p.variantes.find((x) => x.clave === clave) ?? p.variantes[0];
}

export function relacionados(p: Producto, productos: Producto[], n = 4) {
  const porSlug = new Map(productos.map((x) => [x.slug, x]));
  const misma = productos.filter((x) => x.cat === p.cat && x.lineaId !== p.lineaId);
  const extra = ["desinfectante-galon", "cloro-galon", "biowash", "biosoft", "desengrasante-galon"]
    .map((s) => porSlug.get(s))
    .filter((x): x is Producto => !!x && x.lineaId !== p.lineaId && !misma.includes(x));
  return [...misma, ...extra].slice(0, n);
}


const normalizar = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function buscarProductos(
  productos: Producto[],
  f: { cat?: CategoriaId | null; q?: string; aromas?: AromaId[]; tamanos?: string[]; orden?: string },
) {
  const q = normalizar(f.q ?? "");
  let lista = productos.filter(
    (p) =>
      (!f.cat || p.cat === f.cat) &&
      (!q || normalizar(p.nombre).includes(q) || normalizar(p.catNombre).includes(q) || p.codigo.startsWith(q)) &&
      (!f.aromas?.length || p.variantes.some((x) => x.aroma && f.aromas!.includes(x.aroma))) &&
      (!f.tamanos?.length || f.tamanos.includes(p.tamano)),
  );
  const precio = (p: Producto) => p.precio ?? Number.POSITIVE_INFINITY;
  if (f.orden === "asc") lista = [...lista].sort((a, b) => precio(a) - precio(b));
  else if (f.orden === "desc") lista = [...lista].sort((a, b) => (b.precio ?? -1) - (a.precio ?? -1));
  else if (f.orden === "az") lista = [...lista].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  return lista;
}
