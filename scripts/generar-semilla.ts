/*
 * Genera supabase/migrations/0002_catalogo_inicial.sql a partir de scripts/semilla/lineas.ts.
 * Uso: node scripts/generar-semilla.ts   (Node 22+ ejecuta TypeScript directo)
 */
import { writeFileSync } from "node:fs";
import { AROMAS, AROMA_IDS, CATEGORIAS, COLOR_AROMA } from "../src/lib/catalogo.ts";
import { construirProductos } from "./semilla/lineas.ts";

const STOCK_INICIAL = 30;

const q = (s: string | null | undefined) => (s == null ? "null" : `'${s.replace(/'/g, "''")}'`);
const arr = (xs: string[]) => (xs.length ? `array[${xs.map(q).join(", ")}]::text[]` : "'{}'::text[]");

const productos = construirProductos();
const l: string[] = [];

l.push(`-- ============================================================
-- BIOPUREX · 0002 · Catálogo inicial (GENERADO por scripts/generar-semilla.ts — no editar a mano)
-- Aromas, categorías, ${productos.length} productos (uno por tamaño) con sus variantes por aroma,
-- stock inicial de ejemplo (${STOCK_INICIAL} por variante; 0 en las marcadas como agotadas) y la configuración.
-- PRECIOS Y DATOS BANCARIOS SON DE EJEMPLO hasta que el cliente los confirme.
-- Ejecutar DESPUÉS de 0001_esquema_inicial.sql.
-- ============================================================
`);

l.push("insert into public.aromas (id, nombre, color, orden) values");
l.push(AROMA_IDS.map((a, i) => `  (${q(a)}, ${q(AROMAS[a])}, ${q(COLOR_AROMA[a])}, ${i})`).join(",\n") + ";\n");

l.push("insert into public.categorias (id, nombre, corto, img, tinte, oscura, orden) values");
l.push(
  CATEGORIAS.map(
    (c, i) => `  (${q(c.id)}, ${q(c.nombre)}, ${q(c.corto)}, ${q(c.img)}, ${q(c.tinte ?? null)}, ${!!c.oscura}, ${i})`,
  ).join(",\n") + ";\n",
);

productos.forEach((p, i) => {
  l.push(
    `insert into public.productos (slug, linea, nombre, nombre_base, tamano, categoria_id, precio, descripcion, beneficios, modo_uso, seguridad, cotizar, insignias, tinte, notas, orden) values (` +
      [
        q(p.slug),
        q(p.lineaId),
        q(p.nombre),
        q(p.nombreBase),
        q(p.tamano),
        q(p.cat),
        p.precio == null ? "null" : p.precio.toFixed(2),
        q(p.desc),
        arr(p.beneficios),
        arr(p.modoUso),
        String(p.seguridad),
        String(p.cotizar),
        arr(p.insignias),
        q(p.tinte),
        `${q(JSON.stringify(p.notas))}::jsonb`,
        String(i),
      ].join(", ") +
      ");",
  );
  l.push(
    "insert into public.variantes (producto_id, clave, aroma_id, etiqueta, img, sku, stock, orden) values\n" +
      p.variantes
        .map(
          (v, j) =>
            `  ((select id from public.productos where slug = ${q(p.slug)}), ${q(v.clave)}, ${q(v.aroma)}, ${q(v.etiqueta)}, ${q(v.img)}, ${q(
              `${p.slug}-${v.clave}`.toUpperCase(),
            )}, ${v.agotado ? 0 : STOCK_INICIAL}, ${j})`,
        )
        .join(",\n") +
      ";\n",
  );
});

l.push(`insert into public.configuracion (banco, tipo_cuenta, numero_cuenta, titular, envio_sps, envio_resto)
values ('Banco Atlántida', 'Cuenta de ahorro en Lempiras', '2001-0045-6789', 'BIOPUREX', 60, 150)
on conflict (id) do nothing;
`);

writeFileSync(new URL("../supabase/migrations/0002_catalogo_inicial.sql", import.meta.url), l.join("\n"));
console.log(`Listo: ${productos.length} productos, ${productos.reduce((s, p) => s + p.variantes.length, 0)} variantes.`);
