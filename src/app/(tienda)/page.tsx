import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ProductoEstrella } from "@/components/tienda/inicio/producto-estrella";
import { TarjetaProducto } from "@/components/tienda/tarjeta-producto";
import { AROMAS, AROMA_IDS, aromaVar } from "@/lib/catalogo";
import { obtenerCategorias, obtenerInicio, obtenerProductos } from "@/lib/datos/catalogo";
import { datosOrganizacion, jsonLd } from "@/lib/sitio";

export const metadata = { alternates: { canonical: "/" } };

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
  { titulo: "Calidad garantizada", texto: "Fórmulas de alto rendimiento para un resultado profesional." },
  { titulo: "Fórmulas biodegradables", texto: "Opciones ecoamigables como BIOGLASS y FOOD SAFE." },
  { titulo: "Limpieza profesional", texto: "Para hogares, oficinas, restaurantes, hoteles e instituciones." },
  { titulo: "Envíos a todo Honduras", texto: "De San Pedro Sula a tu puerta, en cualquier departamento." },
];

const PASOS = [
  { titulo: "Elige tus productos", texto: "Escoge el aroma y la presentación que necesitas." },
  { titulo: "Confirma tu pedido", texto: "Ingresa tu dirección y ve el costo de envío al instante." },
  { titulo: "Paga por transferencia", texto: "Sube la foto de tu comprobante desde Mis pedidos." },
  { titulo: "Recíbelo en casa", texto: "Te avisamos cuando tu pedido va en camino." },
];

const contenedor = "mx-auto max-w-[1280px] px-[clamp(16px,3vw,40px)]";
const grid4 = "grid grid-cols-2 gap-3 min-[900px]:grid-cols-4 min-[900px]:gap-6";
/** Cada bloque deja su aire arriba, así el orden que elija el admin no rompe el ritmo. */
const arriba = "pt-[clamp(56px,8vw,112px)]";
const arribaMargen = "mt-[clamp(56px,8vw,112px)]";
/** Filas de datos separadas por filetes finos, sin tarjetas (2 columnas en celular, 4 en escritorio). */
const filetes =
  "m-0 grid list-none grid-cols-2 border-t border-line p-0 min-[900px]:grid-cols-4 [&>*]:border-b [&>*]:border-line [&>*]:py-[clamp(18px,2.4vw,28px)] [&>*:nth-child(odd)]:pr-4 [&>*:nth-child(even)]:border-l [&>*:nth-child(even)]:pl-4 min-[900px]:[&>*]:border-l min-[900px]:[&>*]:px-6 min-[900px]:[&>*:first-child]:border-l-0 min-[900px]:[&>*:first-child]:pl-0";

function Etiqueta({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`text-xs font-semibold uppercase tracking-[.12em] text-text-2 ${className}`}>{children}</span>;
}

function Titulo({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`font-display m-0 text-[clamp(28px,3.2vw,44px)] leading-none ${className}`}>{children}</h2>;
}

/** Encabezado de sección: filete arriba, título a la izquierda y enlace a la derecha. */
function Encabezado({ titulo, descripcion, href }: { titulo: string; descripcion?: string | null; href?: string }) {
  return (
    <div className="mb-[clamp(20px,3vw,36px)] flex items-end justify-between gap-4 border-t border-line pt-5">
      <div className="flex flex-col gap-2">
        <Titulo>{titulo}</Titulo>
        {descripcion && <p className="m-0 max-w-[60ch] text-pretty leading-[1.55] text-text-2">{descripcion}</p>}
      </div>
      {href && <VerTodo href={href} />}
    </div>
  );
}

function VerTodo({ href }: { href: string }) {
  return (
    <Link href={href} className="flex h-11 flex-none items-center gap-1 rounded-full pl-3 pr-1 text-sm font-semibold no-underline hover:bg-surface">
      Ver todo <ChevronRight size={16} strokeWidth={2.25} aria-hidden />
    </Link>
  );
}

export default async function Inicio() {
  const [productos, categorias, secciones] = await Promise.all([obtenerProductos(), obtenerCategorias(), obtenerInicio()]);
  const porSlug = (s: string) => productos.find((p) => p.slug === s);
  const galon = porSlug("desinfectante-galon");
  const litro = porSlug("desinfectante-litro");
  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(datosOrganizacion()) }} />
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
                className="drop-product-dark relative flex-none"
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

      {/* Quiénes somos: una frase grande + datos en filetes, sin tarjetas */}
      <section id="quienes-somos" className={`${contenedor} scroll-mt-28 pt-[clamp(56px,9vw,128px)]`}>
        <div className="grid grid-cols-1 gap-5 min-[900px]:grid-cols-[minmax(0,1fr)_minmax(0,3fr)] min-[900px]:gap-10">
          <Etiqueta className="pt-2">Quiénes somos</Etiqueta>
          <div className="flex flex-col gap-5">
            <p className="m-0 max-w-[26ch] text-balance text-[clamp(26px,3.6vw,48px)] font-semibold leading-[1.12] tracking-[-.015em] text-navy">
              Somos BIOPUREX, una marca hondureña que fabrica productos de limpieza en San Pedro Sula y te los lleva a la
              puerta.
            </p>
            <p className="m-0 max-w-[56ch] text-pretty leading-[1.65] text-text-2">
              Desinfectantes, detergentes, jabones, aromatizantes y una línea automotriz para el día a día de los hogares
              y negocios del país. Vendemos solo en línea: sin tienda física, directo de nosotros a ti.
            </p>
          </div>
        </div>
        <ul className={`${filetes} mt-[clamp(36px,5vw,72px)]`}>
          {VALORES.map(({ titulo, texto }) => (
            <li key={titulo} className="flex flex-col gap-1.5">
              <span className="text-[15px] font-bold leading-tight">{titulo}</span>
              <span className="text-sm leading-normal text-text-2">{texto}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Cómo comprar: pasos numerados en una fila */}
      <section className={`${contenedor} ${arriba}`}>
        <div className="mb-[clamp(16px,2vw,24px)] flex items-baseline justify-between gap-4">
          <Etiqueta>Cómo comprar</Etiqueta>
          <Link href="/envios" className="text-sm font-semibold text-text-2 underline-offset-4 hover:text-navy hover:underline">
            Envíos y pagos
          </Link>
        </div>
        <ol className={filetes}>
          {PASOS.map((s, i) => (
            <li key={s.titulo} className="flex flex-col gap-1.5">
              <span className="font-display text-[22px] leading-none text-navy">{String(i + 1).padStart(2, "0")}</span>
              <span className="mt-1 text-[15px] font-bold leading-tight">{s.titulo}</span>
              <span className="text-sm leading-normal text-text-2">{s.texto}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Bloques y filas de productos: se editan en el panel (Configuración → Página de inicio) */}
      {secciones.map((sec) => {
        if (sec.tipo === "estrella") return galon && litro ? (
            <div key={sec.id} className={arribaMargen}>
              <ProductoEstrella galon={galon} litro={litro} />
            </div>
          ) : null;
        if (sec.tipo === "categorias")
          return (
            <section key={sec.id} className={`${contenedor} ${arriba}`}>
              <Encabezado titulo={sec.titulo} href="/catalogo" />
              <div className={grid4}>
                {categorias.filter((c) => productos.some((p) => p.cat === c.id)).map((c) => (
                  <Link
                    key={c.id}
                    href={`/catalogo?cat=${c.id}`}
                    className="group relative flex aspect-[1/1.05] flex-col justify-between overflow-hidden rounded-lg bg-surface p-[clamp(14px,1.6vw,22px)] no-underline transition-colors duration-200"
                  >
                    <span
                      aria-hidden
                      className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      style={{ background: `color-mix(in srgb, ${c.tinte ? aromaVar(c.tinte) : "var(--navy)"} 10%, var(--surface))` }}
                    />
                    <span className="font-display relative z-[1] max-w-[9ch] text-[clamp(20px,2.1vw,30px)] leading-none text-navy">{c.nombre}</span>
                    <span className="relative z-[1] text-[13px] font-semibold text-text-2">
                      {productos.filter((p) => p.cat === c.id).reduce((s, p) => s + p.variantes.length, 0)} productos
                    </span>
                    <div className="drop-product absolute -bottom-[3%] -right-[4%] h-[72%] w-[70%] transition-transform duration-300 group-hover:-translate-y-1 motion-reduce:transition-none">
                      <Image src={c.img ? `/img/${c.img}.webp` : (productos.find((p) => p.cat === c.id)?.variantes[0]?.img ?? "/img/logo.png")} alt="" fill sizes="(max-width: 899px) 30vw, 200px" className="object-contain" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        if (sec.tipo === "aromas")
          return (
            <section key={sec.id} className={`${contenedor} ${arriba}`}>
              <Encabezado titulo={sec.titulo} />
              <div className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-1 overflow-x-auto pb-2">
                {AROMA_IDS.map((a) => (
                  <Link
                    key={a}
                    href={`/catalogo?aroma=${a}`}
                    className="flex w-[88px] flex-none snap-start flex-col items-center gap-2.5 rounded-md px-1 py-2.5 no-underline transition-colors hover:bg-surface"
                  >
                    <span className="size-12 rounded-full" style={{ background: aromaVar(a) }} />
                    <span className="text-center text-[13px] font-semibold leading-tight">{AROMAS[a]}</span>
                  </Link>
                ))}
              </div>
            </section>
          );
        const enlace = sec.categoriaId ? `/catalogo?cat=${sec.categoriaId}` : "/catalogo";
        const tarjetas = (
          <div className={grid4}>
            {sec.items.map(({ slug, clave }) => {
              const p = porSlug(slug);
              return p ? <TarjetaProducto key={`${slug}-${clave}`} producto={p} clave={clave} /> : null;
            })}
          </div>
        );
        if (sec.tema === "oscuro") {
          const cat = categorias.find((c) => c.id === sec.categoriaId);
          return (
            <section key={sec.id} className={`${arribaMargen} bg-graphite text-white`}>
              <div className={`${contenedor} py-[clamp(48px,7vw,104px)]`}>
                <div className="mb-[clamp(20px,3vw,36px)] flex flex-wrap items-end justify-between gap-4">
                  <div className="flex max-w-[560px] flex-col gap-3">
                    <Titulo>{sec.titulo}</Titulo>
                    {sec.descripcion && <p className="m-0 text-pretty leading-[1.55] text-on-dark-2">{sec.descripcion}</p>}
                  </div>
                  <Link
                    href={enlace}
                    className="inline-flex h-11 items-center gap-1 rounded-full pl-4 pr-2 text-sm font-semibold text-white no-underline shadow-[inset_0_0_0_1.5px_var(--graphite-3)] transition-colors hover:bg-graphite-2"
                  >
                    {cat ? `Ver ${cat.corto.toLowerCase()}` : "Ver todo"} <ChevronRight size={16} strokeWidth={2.25} aria-hidden />
                  </Link>
                </div>
                {tarjetas}
              </div>
            </section>
          );
        }
        return (
          <section key={sec.id} className={`${contenedor} ${arriba}`}>
            <Encabezado titulo={sec.titulo} descripcion={sec.descripcion} href={enlace} />
            {tarjetas}
          </section>
        );
      })}

      {/* Mayoreo: franja simple con filetes, sin bloque de color */}
      <section className={`${contenedor} ${arriba} pb-[clamp(56px,8vw,112px)]`}>
        <div className="grid grid-cols-1 items-center gap-8 border-y border-line py-[clamp(32px,5vw,64px)] min-[900px]:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="flex flex-col items-start gap-4">
            <Etiqueta>Mayoreo</Etiqueta>
            <Titulo>Para negocios</Titulo>
            <p className="m-0 max-w-[46ch] text-pretty leading-[1.55] text-text-2">
              Presentaciones de galón y 20 litros. Ideal para lavanderías, hoteles, restaurantes, carwash, industrias y uso
              institucional.
            </p>
            <a
              href={`mailto:mibiopurex@gmail.com?subject=${encodeURIComponent("Solicitud de cotización para negocio")}`}
              className="mt-2 inline-flex h-[52px] items-center gap-2 rounded-full bg-navy px-6 font-semibold text-white no-underline transition-transform active:scale-[.98]"
            >
              Solicitar cotización <ChevronRight size={20} aria-hidden />
            </a>
          </div>
          <div className="flex items-end justify-center min-[900px]:justify-end">
            <Image src="/img/foam_20.webp" alt="BIOFOAM X 20 litros" width={180} height={230} className="drop-product relative h-[clamp(160px,18vw,220px)] w-auto object-contain" />
            <Image src="/img/motores_20.webp" alt="Desengrasante de motores 20 litros" width={160} height={200} className="drop-product relative -ml-6 h-[clamp(140px,16vw,190px)] w-auto object-contain" />
            <Image src="/img/shampoo_20.webp" alt="Shampoo para carros 20 litros" width={140} height={180} className="drop-product relative -ml-6 h-[clamp(120px,14vw,170px)] w-auto object-contain" />
          </div>
        </div>
      </section>
    </main>
  );
}
