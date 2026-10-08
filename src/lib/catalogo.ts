/*
 * Catálogo de BIOPUREX.
 * Modelo (decisión de Cristian, 2026-10-08): cada TAMAÑO es un producto distinto y se muestra
 * como tarjeta aparte; dentro de cada producto, los AROMAS son las variantes.
 * Textos: del catálogo PDF. Precios: de ejemplo (hasta que el cliente los confirme).
 * Esta capa se reemplaza por Supabase en la fase 2; las páginas solo usan las funciones de abajo.
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

export const AROMA_IDS = Object.keys(AROMAS) as AromaId[];

export const aromaVar = (a: AromaId) => `var(--aroma-${a})`;

export type CategoriaId =
  | "hogar"
  | "lavanderia"
  | "cocina"
  | "alimenticio"
  | "aromatizantes"
  | "auto"
  | "articulos"
  | "dispensadores";

export type Categoria = {
  id: CategoriaId;
  nombre: string;
  corto: string;
  img: string;
  tinte?: AromaId;
  oscura?: boolean;
};

export const CATEGORIAS: Categoria[] = [
  { id: "hogar", nombre: "Limpieza del hogar", corto: "Hogar", img: "des_lav_gal", tinte: "lavanda" },
  { id: "lavanderia", nombre: "Lavandería", corto: "Lavandería", img: "biowash_sweet", tinte: "sweetfusion" },
  { id: "cocina", nombre: "Cocina y manos", corto: "Cocina y manos", img: "manos_cereza", tinte: "cereza" },
  { id: "alimenticio", nombre: "Grado alimenticio", corto: "Grado alimenticio", img: "biodish", tinte: "espuma" },
  { id: "aromatizantes", nombre: "Aromatizantes BIOSCENT", corto: "Aromatizantes", img: "scent_mandarina", tinte: "mandarina" },
  { id: "auto", nombre: "Línea automotriz", corto: "Automotriz", img: "foam_gal", oscura: true },
  { id: "articulos", nombre: "Artículos de limpieza", corto: "Artículos", img: "escoba" },
  { id: "dispensadores", nombre: "Dispensadores", corto: "Dispensadores", img: "disp_jabon" },
];

export const categoria = (id: CategoriaId) => CATEGORIAS.find((c) => c.id === id)!;

type Uso = "hogar" | "lavanderia" | "cocina" | "aroma" | "auto";
type Insignia = "mas" | "nuevo";

export const MODO_USO: Record<Uso, string[]> = {
  hogar: [
    "Aplica el producto directo o diluido en agua, según la etiqueta.",
    "Limpia la superficie con un paño, esponja o trapeador.",
    "Deja actuar unos minutos y enjuaga si es necesario.",
  ],
  lavanderia: [
    "Agrega la dosis indicada en la etiqueta según el tamaño de la carga.",
    "Para manchas difíciles, aplica directo y deja actuar antes de lavar.",
  ],
  cocina: [
    "Aplica una pequeña cantidad en la esponja o en las manos húmedas.",
    "Frota hasta formar espuma y enjuaga con abundante agua.",
  ],
  aroma: ["Rocía al aire o sobre telas a unos 30 cm de distancia."],
  auto: [
    "Diluye según la etiqueta o aplica directo en presentaciones listas para usar.",
    "Aplica sobre la superficie, deja actuar y enjuaga o retira con microfibra.",
  ],
};

export const AVISO_SEGURIDAD = [
  "Manténgase fuera del alcance de los niños.",
  "No mezclar con otros productos químicos, especialmente amoníaco o ácidos.",
  "Usa guantes y evita el contacto con ojos y piel; en caso de contacto, enjuaga con abundante agua.",
  "Almacena en un lugar fresco y ventilado, lejos de la luz solar.",
];

/** Tamaños que se agregan al nombre del producto ("Desinfectante Multiusos Galón"). */
const TAMANOS_EN_NOMBRE = new Set(["Galón", "Litro", "740 ml", "20 L"]);

/** Tamaños que aparecen como filtro "Presentación" en el catálogo. */
export const TAMANOS_FILTRO = ["740 ml", "Litro", "Galón", "20 L", "Spray"];

// ---------------------------------------------------------------------------
// Líneas (producto base con sus tamaños). Fuente: BIOPUREX Tienda.dc.html
// ---------------------------------------------------------------------------

type V = { aroma: AromaId | null; tamano: string; precio: number | null; img: string; agotado?: boolean; etiqueta?: string };

type Linea = {
  id: string;
  nombre: string;
  cat: CategoriaId;
  desc: string;
  beneficios: string[];
  uso?: Uso;
  seguridad?: boolean;
  cotizar?: boolean;
  insignias?: Insignia[];
  tinte?: AromaId;
  notas?: Partial<Record<AromaId, string>>;
  variantes: V[];
};

const v = (aroma: AromaId | null, tamano: string, precio: number | null, img: string, agotado = false): V => ({
  aroma,
  tamano,
  precio,
  img,
  agotado,
});

const unidad = (id: string, nombre: string, cat: CategoriaId, tamano: string, precio: number, img: string): Linea => ({
  id,
  nombre,
  cat,
  desc: "",
  beneficios: [],
  variantes: [v(null, tamano, precio, img)],
});

const LINEAS: Linea[] = [
  {
    id: "desinfectante",
    nombre: "Desinfectante Multiusos",
    cat: "hogar",
    insignias: ["mas"],
    uso: "hogar",
    desc: "Mantén tus espacios limpios y libres de gérmenes con nuestro Limpiador Desinfectante. Ideal para pisos y superficies diversas.",
    beneficios: [
      "Elimina el 99.9% de bacterias y gérmenes.",
      "Limpieza profunda en diversas superficies.",
      "Fórmula efectiva: no deja residuos, garantizando limpieza total.",
      "Ideal para uso en hogares, oficinas e instituciones.",
    ],
    notas: {
      pino: "Aroma refrescante: el perfume de pino proporciona una sensación de limpieza y frescura.",
      manzanaverde: "Aroma refrescante: el perfume de manzana verde proporciona una sensación fresca y revitalizante.",
    },
    variantes: [
      v("lavanda", "Galón", 95, "des_lav_gal"),
      v("lavanda", "Litro", 35, "des_lav_lt"),
      v("citronella", "Galón", 95, "des_cit_gal"),
      v("citronella", "Litro", 35, "des_cit_lt", true),
      v("manzanacanela", "Galón", 95, "des_mc_gal"),
      v("manzanacanela", "Litro", 35, "des_mc_lt"),
      v("limon", "Galón", 95, "des_lim_gal"),
      v("limon", "Litro", 35, "des_lim_lt"),
      v("pino", "Galón", 95, "des_pino_gal", true),
      v("pino", "Litro", 35, "des_pino_lt", true),
      v("manzanaverde", "Galón", 95, "des_mv_gal"),
      v("manzanaverde", "Litro", 35, "des_mv_lt"),
    ],
  },
  {
    id: "desengrasante",
    nombre: "Desengrasante Multiusos pH Neutro",
    cat: "hogar",
    tinte: "manzanaverde",
    insignias: ["nuevo"],
    uso: "hogar",
    desc: "Nuestro Desengrasante Multiusos pH Neutro está diseñado para una limpieza efectiva y segura en cualquier tipo de superficie. Su fórmula balanceada elimina grasa, aceite y suciedad sin dañar materiales delicados ni afectar la piel.",
    beneficios: [
      "Elimina grasa, aceite y suciedad.",
      "No daña materiales delicados ni afecta la piel.",
      "Ideal para uso doméstico, comercial e industrial.",
    ],
    variantes: [v(null, "Galón", 120, "desen_gal"), v(null, "740 ml", 55, "desen_740")],
  },
  {
    id: "antisarro",
    nombre: "Limpiador Antisarro en Gel 3 en 1",
    cat: "hogar",
    tinte: "mandarina",
    uso: "hogar",
    seguridad: true,
    desc: "Eficaz gel desincrustante que utiliza una combinación de detergentes y ácidos para quitar fácilmente las manchas en el inodoro provocadas por moho, hongos y acumulaciones minerales como calcio, magnesio, hierro y otros.",
    beneficios: ["100% removedor de sarro", "99.9% removedor de gérmenes", "Desodoriza"],
    variantes: [v(null, "Litro", 65, "antisarro")],
  },
  {
    id: "cloro",
    nombre: "Cloro Biopurex",
    cat: "hogar",
    tinte: "fresh",
    insignias: ["mas"],
    uso: "hogar",
    seguridad: true,
    desc: "Con su fórmula poderosa, nuestro cloro de alta concentración es tu aliado definitivo contra las bacterias, virus y gérmenes. Eliminando el 99.9% de las amenazas en segundos.",
    beneficios: ["Cloro de alta concentración.", "Elimina el 99.9% de bacterias, virus y gérmenes en segundos."],
    variantes: [v(null, "Galón", 70, "cloro_gal"), v(null, "Litro", 25, "cloro_lt")],
  },
  {
    id: "bioglass",
    nombre: "Limpiavidrios BIOGLASS",
    cat: "hogar",
    tinte: "fresh",
    uso: "hogar",
    desc: "Logra que tus vidrios luzcan impecables y relucientes con la extraordinaria fórmula ecoamigable de Bioglass. Diseñada para ofrecer una limpieza fácil y rápida, esta solución no solo elimina la suciedad y las manchas, sino que también deja un brillo total que hará que tus ventanas, espejos y superficies de vidrio destaquen.",
    beneficios: [
      "Fórmula ecoamigable.",
      "Elimina la suciedad y las manchas.",
      "Brillo total en ventanas, espejos y superficies de vidrio.",
    ],
    variantes: [v(null, "Galón", 110, "bioglass_gal"), v(null, "740 ml", 50, "bioglass_740")],
  },
  {
    id: "biowash",
    nombre: "Detergente Líquido BIOWASH",
    cat: "lavanderia",
    insignias: ["mas"],
    uso: "lavanderia",
    desc: "Detergente líquido de alto rendimiento formulado para limpiar profundamente las prendas, eliminando suciedad y malos olores mientras cuida las fibras y los colores. Su fórmula genera una limpieza eficiente, dejando la ropa fresca, suave y con una agradable fragancia duradera.",
    beneficios: [
      "Limpia profundamente las prendas.",
      "Elimina suciedad y malos olores.",
      "Cuida las fibras y los colores.",
      "Fragancia agradable y duradera.",
    ],
    variantes: [v("espuma", "Galón", 185, "biowash_espuma"), v("sweetfusion", "Galón", 185, "biowash_sweet")],
  },
  {
    id: "polvo",
    nombre: "Detergente en Polvo Industrial",
    cat: "lavanderia",
    tinte: "espuma",
    cotizar: true,
    uso: "lavanderia",
    desc: "Detergente en polvo de alto rendimiento, formulado para la limpieza profunda y remoción eficaz de suciedad, manchas y grasa en prendas de uso diario e industrial.",
    beneficios: [
      "Remoción eficaz de suciedad, manchas y grasa.",
      "Ideal para lavanderías, hoteles, restaurantes, industrias y uso institucional.",
    ],
    variantes: [v(null, "Presentación por confirmar", null, "polvo")],
  },
  {
    id: "biosoft",
    nombre: "Suavizante de Telas BIOSOFT",
    cat: "lavanderia",
    uso: "lavanderia",
    desc: "El suavizante de telas Biopurex está formulado para ofrecer un cuidado superior a tus prendas, brindando una suavidad excepcional y una fragancia fresca que perdura.",
    beneficios: ["Cuidado superior para tus prendas.", "Suavidad excepcional.", "Fragancia fresca que perdura."],
    variantes: [v("sunnypop", "Galón", 150, "biosoft_sunny"), v("sweettouch", "Galón", 150, "biosoft_sweet")],
  },
  {
    id: "jabon-manos",
    nombre: "Jabón de Manos",
    cat: "cocina",
    uso: "cocina",
    desc: "Descubre el cuidado y la suavidad que tu piel merece con nuestra exclusiva línea de jabones para manos. Formulados con fragancias irresistibles.",
    beneficios: ["Cuidado y suavidad para tu piel.", "Fragancias irresistibles."],
    variantes: [
      v("cereza", "Presentación por confirmar", 140, "manos_cereza"),
      v("fresh", "Presentación por confirmar", 140, "manos_fresh"),
      v("passionfruit", "Presentación por confirmar", 140, "manos_passion"),
    ],
  },
  {
    id: "jabon-platos-liquido",
    nombre: "Jabón de Platos Líquido",
    cat: "cocina",
    tinte: "manzanaverde",
    uso: "cocina",
    desc: "Descubre nuestro jabón de platos con fórmula mejorada, diseñado para ofrecer una limpieza superior. Ahora enriquecido con un potente desengrasante, elimina con facilidad la grasa más difícil.",
    beneficios: [
      "Fórmula mejorada.",
      "Enriquecido con un potente desengrasante.",
      "Elimina con facilidad la grasa más difícil.",
    ],
    variantes: [v(null, "Galón", 130, "platos_liq")],
  },
  {
    id: "jabon-platos-crema",
    nombre: "Jabón de Platos en Crema",
    cat: "cocina",
    tinte: "manzanaverde",
    uso: "cocina",
    desc: "Descubre nuestro jabón de platos con fórmula mejorada, diseñado para ofrecer una limpieza superior. Ahora enriquecido con un potente desengrasante, elimina con facilidad la grasa más difícil.",
    beneficios: [
      "Fórmula mejorada.",
      "Enriquecido con un potente desengrasante.",
      "Elimina con facilidad la grasa más difícil.",
    ],
    variantes: [v(null, "Unidad", 45, "platos_crema")],
  },
  {
    id: "biosoap",
    nombre: "BIOSOAP Jabón de Manos",
    cat: "alimenticio",
    tinte: "fresh",
    insignias: ["nuevo"],
    uso: "cocina",
    desc: "BIOSOAP & BIODISH son jabones líquidos de alta calidad diseñados para brindar una limpieza eficaz y confiable. Formulados con agentes limpiadores y espumantes de alto desempeño, ayudan a remover suciedad, grasa y residuos de manera eficiente. BIOSOAP proporciona una limpieza suave y efectiva para las manos.",
    beneficios: ["Limpieza suave y efectiva para las manos.", "Agentes limpiadores y espumantes de alto desempeño."],
    variantes: [v(null, "Galón", 160, "biosoap")],
  },
  {
    id: "biodish",
    nombre: "BIODISH Jabón de Platos",
    cat: "alimenticio",
    tinte: "espuma",
    uso: "cocina",
    desc: "BIOSOAP & BIODISH son jabones líquidos de alta calidad diseñados para brindar una limpieza eficaz y confiable. BIODISH está formulado para uso en áreas de manipulación de alimentos.",
    beneficios: [
      "Para áreas de manipulación de alimentos.",
      "Remueve suciedad, grasa y residuos de manera eficiente.",
    ],
    variantes: [v(null, "Galón", 160, "biodish")],
  },
  {
    id: "foodsafe",
    nombre: "Desengrasante FOOD SAFE",
    cat: "alimenticio",
    tinte: "mandarina",
    uso: "hogar",
    desc: "Es un desengrasante biodegradable líquido formulado con agentes activos que actúan rápidamente para disolver y remover grasa, residuos secos de alimentos y suciedad incrustada.",
    beneficios: ["Biodegradable.", "Disuelve y remueve grasa, residuos secos de alimentos y suciedad incrustada."],
    variantes: [v(null, "Galón", 210, "foodsafe")],
  },
  {
    id: "bioscent",
    nombre: "Aromatizante BIOSCENT",
    cat: "aromatizantes",
    uso: "aroma",
    desc: "",
    beneficios: [],
    variantes: [
      v("carronuevo", "Spray", 85, "scent_carro"),
      v("uva", "Spray", 85, "scent_uva"),
      { ...v("uva", "Spray", 85, "scent_uva2"), etiqueta: "Uva · envase 2" },
      v("mandarina", "Spray", 85, "scent_mandarina"),
      v("vainilla", "Spray", 85, "scent_vainilla"),
    ],
  },
  {
    id: "biofoam",
    nombre: "Shampoo de Espuma Activa BIOFOAM X",
    cat: "auto",
    tinte: "cereza",
    insignias: ["nuevo"],
    uso: "auto",
    desc: "BIOFOAM X es un shampoo de espuma activa de alto rendimiento, formulado especialmente para hidrolavadoras, cañón de espuma y túneles de carwash. Su tecnología espumante genera una espuma abundante, estable y de gran cobertura, ayudando a remover suciedad mientras mejora la experiencia visual del lavado.",
    beneficios: ["Para hidrolavadora, cañón de espuma y carwash.", "Espuma abundante, estable y de gran cobertura."],
    variantes: [v(null, "Galón", 260, "foam_gal"), v(null, "20 L", 1250, "foam_20")],
  },
  {
    id: "shampoo-carros",
    nombre: "Shampoo para Carros Standard",
    cat: "auto",
    tinte: "mandarina",
    uso: "auto",
    desc: "Limpia, protege y da un brillo excepcional a tu vehículo con el shampoo para carros Biopurex. Su fórmula de alta calidad elimina la suciedad más difícil mientras cuida la pintura y deja un acabado reluciente. Espuma abundante y fácil de enjuagar.",
    beneficios: ["Cuida la pintura.", "Acabado reluciente.", "Espuma abundante y fácil de enjuagar."],
    variantes: [v(null, "Galón", 180, "shampoo_gal"), v(null, "20 L", 850, "shampoo_20")],
  },
  {
    id: "llantas",
    nombre: "Abrillantador de Llantas",
    cat: "auto",
    tinte: "fresh",
    uso: "auto",
    desc: "Fórmula avanzada que limpia, restaura y protege, dejando tus llantas con un brillo intenso y un negro profundo. Combate suciedad y crea una capa protectora duradera para un acabado impecable.",
    beneficios: ["Brillo intenso y negro profundo.", "Capa protectora duradera."],
    variantes: [v(null, "740 ml", 75, "llantas_740"), v(null, "Galón", 220, "llantas_gal"), v(null, "20 L", 1050, "llantas_20")],
  },
  {
    id: "tableros",
    nombre: "Abrillantador de Tableros",
    cat: "auto",
    tinte: "vainilla",
    uso: "auto",
    desc: "Dale brillo y protección a los tableros de tu vehículo con nuestra fórmula avanzada que repele el polvo, protege contra rayos UV y deja un acabado impecable. Ideal para interiores de autos que quieren lucir como nuevos.",
    beneficios: ["Repele el polvo.", "Protección contra rayos UV.", "Acabado impecable."],
    variantes: [v(null, "740 ml", 80, "tableros_740"), v(null, "Galón", 230, "tableros_gal"), v(null, "20 L", 1100, "tableros_20")],
  },
  {
    id: "motores",
    nombre: "Desengrasante de Motores y Mecánica",
    cat: "auto",
    tinte: "citronella",
    uso: "auto",
    seguridad: true,
    desc: "Potente desengrasante que utiliza una combinación de detergentes y agentes activos para eliminar fácilmente la grasa, aceite quemado y residuos acumulados en motores, herramientas y piezas mecánicas.",
    beneficios: [
      "Elimina grasa, aceite quemado y residuos acumulados.",
      "Para motores, herramientas y piezas mecánicas.",
    ],
    variantes: [v(null, "Galón", 190, "motores_gal"), v(null, "20 L", 900, "motores_20")],
  },
  unidad("escoba", "Escoba completa", "articulos", "Unidad", 95, "escoba"),
  unidad("mecha", "Mecha y palo de trapeador", "articulos", "Unidad", 120, "mecha"),
  unidad("papel-jumbo", "Papel higiénico Jumbo", "articulos", "Paquete", 480, "papel_jumbo"),
  unidad("toalla-rollo", "Papel toalla en rollo", "articulos", "Rollo", 380, "toalla_rollo"),
  unidad("toalla-inter", "Papel toalla interfoliado", "articulos", "Caja", 520, "toalla_inter"),
  unidad("bolsas", "Bolsas de basura", "articulos", "Paquete", 65, "bolsas"),
  unidad("tapetes", "Tapetes para urinario", "articulos", "Unidad", 75, "tapete"),
  unidad("pastes", "Pastes", "articulos", "Paquete", 45, "pastes"),
  unidad("disp-toalla", "Dispensador de papel toalla en rollo", "dispensadores", "Unidad", 1250, "disp_toalla"),
  unidad("disp-higienico", "Dispensador de papel higiénico", "dispensadores", "Unidad", 950, "disp_hig"),
  unidad("disp-jabon", "Dispensador de jabón automático", "dispensadores", "Unidad", 1450, "disp_jabon"),
  unidad("disp-inter", "Dispensador de papel toalla interfoliado", "dispensadores", "Unidad", 850, "disp_inter"),
];

// ---------------------------------------------------------------------------
// Productos: una entrada por línea + tamaño.
// ---------------------------------------------------------------------------

export type Variante = {
  /** Clave única dentro del producto: el aroma, o "unica" si no tiene. */
  clave: string;
  aroma: AromaId | null;
  etiqueta: string;
  img: string;
  agotado: boolean;
};

export type Producto = {
  slug: string;
  lineaId: string;
  nombre: string;
  nombreBase: string;
  tamano: string;
  cat: CategoriaId;
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
  /** Presentaciones hermanas (otros tamaños de la misma línea). */
  hermanos: { slug: string; tamano: string }[];
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

function construirProductos(): Producto[] {
  const productos: Producto[] = [];
  for (const l of LINEAS) {
    const tamanos = [...new Set(l.variantes.map((x) => x.tamano))];
    const slugDe = (t: string) => (tamanos.length > 1 ? `${l.id}-${slugify(t)}` : l.id);
    for (const t of tamanos) {
      const vs = l.variantes.filter((x) => x.tamano === t);
      const precios = vs.map((x) => x.precio).filter((p): p is number => p != null);
      const aromas = vs.map((x) => x.aroma).filter(Boolean) as AromaId[];
      productos.push({
        slug: slugDe(t),
        lineaId: l.id,
        nombre: TAMANOS_EN_NOMBRE.has(t) ? `${l.nombre} ${t}` : l.nombre,
        nombreBase: l.nombre,
        tamano: t,
        cat: l.cat,
        precio: precios.length ? Math.min(...precios) : null,
        desc: l.desc,
        beneficios: l.beneficios,
        modoUso: l.uso ? MODO_USO[l.uso] : [],
        seguridad: !!l.seguridad,
        cotizar: !!l.cotizar,
        insignias: l.insignias ?? [],
        tinte: l.cat === "articulos" || l.cat === "dispensadores" ? null : (aromas[0] ?? l.tinte ?? null),
        notas: l.notas ?? {},
        variantes: vs.map((x, i) => ({
          clave: x.aroma ? (vs.findIndex((y) => y.aroma === x.aroma) === i ? x.aroma : `${x.aroma}-${i}`) : "unica",
          aroma: x.aroma,
          etiqueta: x.etiqueta ?? (x.aroma ? AROMAS[x.aroma] : t),
          img: `/img/${x.img}.webp`,
          agotado: !!x.agotado,
        })),
        hermanos: tamanos.map((s) => ({ slug: slugDe(s), tamano: s })),
      });
    }
  }
  return productos;
}

export const PRODUCTOS = construirProductos();

const POR_SLUG = new Map(PRODUCTOS.map((p) => [p.slug, p]));

export const productoPorSlug = (slug: string) => POR_SLUG.get(slug);

export const aromasDe = (p: Producto) => [...new Set(p.variantes.map((x) => x.aroma).filter(Boolean))] as AromaId[];

export const esOscuro = (p: Producto) => p.cat === "auto";

export const esMayoreo = (p: Producto) => p.tamano === "20 L" || p.cotizar;

/** Variante inicial: la pedida (si existe), si no la primera con stock. */
export function varianteInicial(p: Producto, clave?: string | null) {
  return p.variantes.find((x) => x.clave === clave) ?? p.variantes.find((x) => !x.agotado) ?? p.variantes[0];
}

export function relacionados(p: Producto, n = 4) {
  const misma = PRODUCTOS.filter((x) => x.cat === p.cat && x.lineaId !== p.lineaId);
  const extra = ["desinfectante-galon", "cloro-galon", "biowash", "biosoft", "desengrasante-galon"]
    .map((s) => POR_SLUG.get(s)!)
    .filter((x) => x && x.lineaId !== p.lineaId && !misma.includes(x));
  return [...misma, ...extra].slice(0, n);
}

export const DESTACADOS = ["desinfectante-galon", "biowash", "jabon-manos", "biosoft"];
export const DESTACADOS_AUTO = ["biofoam-galon", "shampoo-carros-galon", "llantas-galon", "tableros-galon"];

export function buscarProductos(f: {
  cat?: CategoriaId | null;
  q?: string;
  aromas?: AromaId[];
  tamanos?: string[];
  orden?: string;
}) {
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const q = norm(f.q ?? "");
  let lista = PRODUCTOS.filter(
    (p) =>
      (!f.cat || p.cat === f.cat) &&
      (!q || norm(p.nombre).includes(q) || norm(categoria(p.cat).nombre).includes(q)) &&
      (!f.aromas?.length || p.variantes.some((x) => x.aroma && f.aromas!.includes(x.aroma))) &&
      (!f.tamanos?.length || f.tamanos.includes(p.tamano)),
  );
  const precio = (p: Producto) => p.precio ?? Number.POSITIVE_INFINITY;
  if (f.orden === "asc") lista = [...lista].sort((a, b) => precio(a) - precio(b));
  else if (f.orden === "desc") lista = [...lista].sort((a, b) => (b.precio ?? -1) - (a.precio ?? -1));
  else if (f.orden === "az") lista = [...lista].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  return lista;
}

export const ENVIO = { sps: 60, resto: 150 };
