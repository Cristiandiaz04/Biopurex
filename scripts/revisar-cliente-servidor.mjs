// Revisión: archivos de servidor que importan constantes (no componentes) de módulos "use client".
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

let hallazgos = 0;
process.chdir(fileURLToPath(new URL("..", import.meta.url)));
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const norm = (f) => f.split(path.sep).join("/").replace(/^src\//, "@/").replace(/\.tsx?$/, "");
const files = walk("src").filter((f) => /\.tsx?$/.test(f));
const esCliente = (s) => /^["']use client["']/.test(s.trimStart());
const cliente = new Map();
for (const f of files) {
  const s = fs.readFileSync(f, "utf8");
  if (!esCliente(s)) continue;
  const ex = [...s.matchAll(/export (?:const|let) (\w+)/g)].map((m) => m[1]);
  if (ex.length) cliente.set(norm(f), ex);
}
for (const f of files) {
  const s = fs.readFileSync(f, "utf8");
  if (esCliente(s)) continue;
  for (const m of s.matchAll(/import \{([^}]+)\} from "([^"]+)"/g)) {
    let mod = m[2];
    if (mod.startsWith(".")) mod = norm(path.join(path.dirname(f), mod));
    const ex = cliente.get(mod);
    if (!ex) continue;
    const usados = m[1].split(",").map((x) => x.trim()).filter((x) => ex.includes(x));
    if (usados.length) {
      hallazgos++;
      console.log(f, "<-", mod, ":", usados.join(", "));
    }
  }
}
if (hallazgos) {
  console.error(`\n${hallazgos} constante(s) de módulos "use client" usadas en el servidor: muévelas a src/lib/.`);
  process.exit(1);
}
console.log("OK: el servidor no usa constantes de módulos de cliente.");
