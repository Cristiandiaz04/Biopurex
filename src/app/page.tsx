import Image from "next/image";
import Link from "next/link";
import { Award, ChevronRight, Leaf, Sparkles, Truck } from "lucide-react";
import { ProductoEstrella } from "@/components/tienda/inicio/producto-estrella";
import { TarjetaProducto } from "@/components/tienda/tarjeta-producto";
import {
  AROMAS,
  AROMA_IDS,
  CATEGORIAS,
  DESTACADOS,
  DESTACADOS_AUTO,
  PRODUCTOS,
  aromaVar,
  productoPorSlug,
} from "@/lib/catalogo";

const BOTELLAS: [string, number, number][] = [
  ["des_cit_lt", 10, 74],
  ["biosoft_sunny", 21, 62],
  ["des_lav_lt", 10, 84],
  ["des_mc_gal", 24, 80],
  ["des_mv_lt", 10, 84],
  ["manos_passion", 21, 62],
  ["des_lim_lt", 10, 74],
];

const VALORES = [
  { icono: Award, titulo: "Calidad garantizada", texto: "Fórmulas de alto rendimiento para un resultado profesional." },
  { icono: Leaf, titulo: "Fórmulas biodegradables", texto: "Opciones ecoamigables como BIOGLASS y FOOD SAFE." },
  { icono: Sparkles, titulo: "Limpieza profesional", texto: "Para hogares, oficinas, restaurantes, hoteles e instituciones." },
  { icono: Truck, titulo: "Envíos a todo Honduras", texto: "De San Pedro Sula a tu puerta, en cualquier departamento." },
];

const PASOS = [
  { n: 1, titulo: "Elige tus productos", texto: "Escoge el aroma y la presentación que necesitas.", aroma: "lavanda", pct: 16 },
  { n: 2, titulo: "Confirma tu pedido", texto: "Ingresa tu dirección y ve el costo de envío al instante.", aroma: "fresh", pct: 18 },
  { n: 3, titulo: "Paga por transferencia", texto: "Sube la foto de tu comprobante desde Mis pedidos.", aroma: "citronella", pct: 20 },
  { n: 4, titulo: "Recíbelo en casa", texto: "Te avisamos cuando tu pedido va en camino.", aroma: "manzanaverde", pct: 18 },
] as const;

const contenedor = "mx-auto max-w-[1280px] px-[clamp(16px,3vw,40px)]";
const grid4 = "grid grid-cols-2 gap-3 min-[900px]:grid-cols-4 min-[900px]:gap-6";

function Titulo({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <span className="brand-line mb-3" />
      <h2 className="font-display text-h2 m-0">{children}</h2>
    </div>
  );
}

function VerTodo({ href }: { href: string }) {
  return (
    <Link href={href} className="flex h-11 items-center gap-1 rounded-full pl-3 pr-1 text-sm font-semibold no-underline hover:bg-surface">
      Ver todo <ChevronRight size={16} strokeWidth={2.25} aria-hidden />
    </Link>
  );
}

export default function Inicio() {
  return (
    <main>
      {/* Portada */}
      <section className="relative overflow-hidden bg-navy text-white">
        <div className="absolute -right-[14%] -top-[36%] aspect-square w-[72%] rounded-full bg-navy-700" />
        <div className={`${contenedor} relative grid grid-cols-1 items-end gap-[clamp(8px,4vw,56px)] pt-[clamp(40px,7vw,104px)] min-[900px]:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]`}>
          <div className="flex flex-col gap-5 pb-[clamp(8px,6vw,96px)]">
            <div className="flex items-center gap-2.5">
              <span className="h-[3px] w-8 rounded-sm bg-green" />
              <span className="text-[13px] font-semibold uppercase tracking-[.08em]">Hecho en San Pedro Sula, Honduras</span>
            </div>
            <h1 className="font-display text-h1 m-0">
              Tu mejor aliado
              <br />
              en la limpieza
            </h1>
            <p className="m-0 max-w-[44ch] text-pretty text-[clamp(16px,1.4vw,19px)] leading-[1.55] text-on-navy-2">
              Productos de limpieza hondureños para tu hogar, tu negocio y tu carro. Compra en línea y te lo llevamos a
              cualquier parte de Honduras.
            </p>
            <div className="mt-1 flex flex-wrap gap-3">
              <Link
                href="/catalogo"
                className="inline-flex h-[52px] items-center gap-2 whitespace-nowrap rounded-full bg-white px-7 font-semibold text-navy no-underline transition-transform active:scale-[.98]"
              >
                Ir a la tienda <ChevronRight size={20} aria-hidden />
              </Link>
              <a
                href="#quienes-somos"
                className="inline-flex h-[52px] items-center rounded-full px-6 font-semibold text-white no-underline shadow-[inset_0_0_0_1.5px_var(--white)] transition-colors hover:bg-navy-700"
              >
                Conócenos
              </a>
            </div>
          </div>
          <div aria-hidden className="relative flex h-[clamp(240px,34vw,460px)] items-end justify-center">
            {BOTELLAS.map(([img, w, h], i) => (
              <div
                key={img}
                className="drop-product-dark animate-rise-in relative flex-none"
                style={{ width: `${w}%`, height: `${h}%`, marginLeft: i ? "-2%" : 0, animationDelay: `${120 + i * 90}ms` }}
              >
                <Image src={`/img/${img}.webp`} alt="" fill priority={i === 3} sizes="(max-width: 899px) 24vw, 160px" className="object-contain object-bottom" />
              </div>
            ))}
          </div>
        </div>
        <div aria-hidden className="relative flex h-2">
          {AROMA_IDS.map((a) => (
            <span key={a} className="flex-1" style={{ background: aromaVar(a) }} />
          ))}
        </div>
      </section>

      {/* Quiénes somos */}
      <section
        id="quienes-somos"
        className={`${contenedor} grid scroll-mt-28 grid-cols-1 items-start gap-[clamp(28px,4vw,64px)] pt-[clamp(48px,7vw,96px)] min-[900px]:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]`}
      >
        <div className="flex flex-col gap-4">
          <span className="brand-line" />
          <h2 className="font-display text-h2 m-0">Quiénes somos</h2>
          <p className="m-0 max-w-[52ch] text-pretty text-[17px] leading-[1.65]">
            Somos <strong>BIOPUREX</strong>, una marca hondureña de productos de limpieza de San Pedro Sula. Desarrollamos
            desinfectantes, detergentes, jabones, aromatizantes y una línea automotriz pensados para el día a día de los
            hogares y negocios del país.
          </p>
          <p className="m-0 max-w-[52ch] text-pretty leading-[1.65] text-text-2">
            Vendemos solo en línea: sin tienda física, directo de nosotros a tu puerta.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {VALORES.map(({ icono: Icono, titulo, texto }) => (
            <div key={titulo} className="flex flex-col gap-2.5 rounded-lg bg-surface p-[clamp(16px,2vw,24px)]">
              <span className="flex size-11 items-center justify-center rounded-full bg-bg text-navy shadow-1">
                <Icono size={20} aria-hidden />
              </span>
              <div className="text-base font-bold leading-tight">{titulo}</div>
              <div className="text-sm leading-normal text-text-2">{texto}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Cómo trabajamos */}
      <section className={`${contenedor} py-[clamp(48px,7vw,96px)]`}>
        <Titulo className="mb-6">Cómo trabajamos</Titulo>
        <ol className={`${grid4} m-0 list-none p-0`}>
          {PASOS.map((s) => (
            <li key={s.n} className="flex flex-col gap-2.5 rounded-lg p-[clamp(16px,2vw,24px)] shadow-[inset_0_0_0_1px_var(--border)]">
              <span
                className="font-display flex size-[52px] items-center justify-center rounded-full text-2xl"
                style={{ background: `color-mix(in srgb, ${aromaVar(s.aroma)} ${s.pct}%, var(--bg))` }}
              >
                {s.n}
              </span>
              <div className="text-base font-bold leading-tight">{s.titulo}</div>
              <div className="text-sm leading-normal text-text-2">{s.texto}</div>
            </li>
          ))}
        </ol>
      </section>

      <ProductoEstrella />

      {/* Categorías */}
      <section className={`${contenedor} pt-[clamp(40px,6vw,80px)]`}>
        <div className="mb-6 flex items-end justify-between gap-4">
          <Titulo>Categorías</Titulo>
          <VerTodo href="/catalogo" />
        </div>
        <div className={grid4}>
          {CATEGORIAS.map((c) => (
            <Link
              key={c.id}
              href={`/catalogo?cat=${c.id}`}
              className={`relative flex aspect-[1/1.05] flex-col justify-between overflow-hidden rounded-lg p-[clamp(14px,1.6vw,22px)] no-underline transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-2 ${
                c.oscura ? "bg-graphite" : c.tinte ? "" : "bg-surface"
              }`}
              style={c.tinte ? { background: `color-mix(in srgb, ${aromaVar(c.tinte)} 14%, var(--bg))` } : undefined}
            >
              <span className={`font-display relative z-[1] max-w-[9ch] text-[clamp(20px,2.1vw,30px)] leading-none ${c.oscura ? "text-white" : "text-navy"}`}>
                {c.nombre}
              </span>
              <span className={`relative z-[1] text-[13px] font-semibold ${c.oscura ? "text-on-dark-2" : "text-text-2"}`}>
                {PRODUCTOS.filter((p) => p.cat === c.id).length} productos
              </span>
              <div className="drop-product absolute -bottom-[3%] -right-[4%] h-[72%] w-[70%]">
                <Image src={`/img/${c.img}.webp`} alt="" fill sizes="(max-width: 899px) 30vw, 200px" className="object-contain" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Explora por aroma */}
      <section className={`${contenedor} pt-[clamp(40px,6vw,80px)]`}>
        <Titulo className="mb-5">Explora por aroma</Titulo>
        <div className="no-scrollbar flex snap-x snap-mandatory gap-1 overflow-x-auto pb-2 pt-1">
          {AROMA_IDS.map((a) => (
            <Link
              key={a}
              href={`/catalogo?aroma=${a}`}
              className="flex w-24 flex-none snap-start flex-col items-center gap-2.5 rounded-md px-1 py-2.5 no-underline transition-colors hover:bg-surface"
            >
              <span
                className="size-16 rounded-full"
                style={{ background: aromaVar(a), boxShadow: `inset 0 0 0 7px color-mix(in srgb, ${aromaVar(a)} 45%, var(--white))` }}
              />
              <span className="text-center text-[13px] font-semibold leading-tight">{AROMAS[a]}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Más vendidos */}
      <section className={`${contenedor} py-[clamp(40px,6vw,80px)]`}>
        <div className="mb-6 flex items-end justify-between gap-4">
          <Titulo>Más vendidos</Titulo>
          <VerTodo href="/catalogo" />
        </div>
        <div className={grid4}>
          {DESTACADOS.map((s) => (
            <TarjetaProducto key={s} producto={productoPorSlug(s)!} />
          ))}
        </div>
      </section>

      {/* Línea automotriz */}
      <section className="bg-graphite text-white">
        <div className={`${contenedor} py-[clamp(48px,7vw,96px)]`}>
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-[560px]">
              <span className="brand-line mb-3" />
              <h2 className="font-display text-h2 mb-3 mt-0">Línea automotriz</h2>
              <p className="m-0 text-pretty leading-[1.55] text-on-dark-2">
                Shampoo, abrillantadores y desengrasantes para tu vehículo o tu carwash, en 740 ml, galón y 20 litros.
              </p>
            </div>
            <Link
              href="/catalogo?cat=auto"
              className="inline-flex h-[52px] items-center gap-2 rounded-full bg-white px-6 font-semibold text-graphite no-underline transition-transform active:scale-[.98]"
            >
              Ver línea automotriz <ChevronRight size={20} aria-hidden />
            </Link>
          </div>
          <div className={grid4}>
            {DESTACADOS_AUTO.map((s) => (
              <TarjetaProducto key={s} producto={productoPorSlug(s)!} />
            ))}
          </div>
        </div>
      </section>

      {/* Mayoreo */}
      <section className={`${contenedor} py-[clamp(40px,6vw,80px)]`}>
        <div className="grid grid-cols-1 overflow-hidden rounded-xl bg-navy text-white min-[900px]:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="flex flex-col items-start gap-4 p-[clamp(28px,4vw,56px)]">
            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[.08em] text-navy">Mayoreo</span>
            <h2 className="font-display text-h2 m-0">Para negocios</h2>
            <p className="m-0 max-w-[46ch] text-pretty leading-[1.55]">
              Presentaciones de galón y 20 litros. Ideal para lavanderías, hoteles, restaurantes, carwash, industrias y uso
              institucional.
            </p>
            <a
              href={`mailto:mibiopurex@gmail.com?subject=${encodeURIComponent("Solicitud de cotización para negocio")}`}
              className="mt-2 inline-flex h-[52px] items-center gap-2 rounded-full bg-white px-6 font-semibold text-navy no-underline"
            >
              Solicitar cotización <ChevronRight size={20} aria-hidden />
            </a>
          </div>
          <div className="relative flex min-h-[260px] items-end justify-center px-6 pt-6">
            <div className="absolute -right-[60px] top-5 size-[340px] rounded-full bg-navy-700" />
            <Image src="/img/foam_20.webp" alt="BIOFOAM X 20 litros" width={180} height={230} className="relative h-[230px] w-auto object-contain" />
            <Image src="/img/motores_20.webp" alt="Desengrasante de motores 20 litros" width={160} height={200} className="relative -ml-7 h-[200px] w-auto object-contain" />
            <Image src="/img/shampoo_20.webp" alt="Shampoo para carros 20 litros" width={140} height={180} className="relative -ml-7 h-[180px] w-auto object-contain" />
          </div>
        </div>
      </section>
    </main>
  );
}
