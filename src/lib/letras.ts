/** Total en letras para facturas: 1250.5 → "MIL DOSCIENTOS CINCUENTA LEMPIRAS CON 50/100". */

const UNIDADES = ["", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
const DIEZ_A_VEINTINUEVE = [
  "DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISÉIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE",
  "VEINTE", "VEINTIUNO", "VEINTIDÓS", "VEINTITRÉS", "VEINTICUATRO", "VEINTICINCO", "VEINTISÉIS", "VEINTISIETE", "VEINTIOCHO", "VEINTINUEVE",
];
const DECENAS = ["", "", "", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
const CENTENAS = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];

function hasta99(n: number): string {
  if (n < 10) return UNIDADES[n];
  if (n < 30) return DIEZ_A_VEINTINUEVE[n - 10];
  const d = Math.floor(n / 10);
  const u = n % 10;
  return u ? `${DECENAS[d]} Y ${UNIDADES[u]}` : DECENAS[d];
}

function hasta999(n: number): string {
  if (n === 100) return "CIEN";
  const c = Math.floor(n / 100);
  const r = n % 100;
  return [CENTENAS[c], hasta99(r)].filter(Boolean).join(" ");
}

/** "VEINTIUNO" → "VEINTIÚN", "…UNO" → "…UN" (antes de MIL, MILLONES y LEMPIRAS). */
const apocope = (s: string) => s.replace(/VEINTIUNO$/, "VEINTIÚN").replace(/UNO$/, "UN");

/** Entero 0 … 999 999 999 en palabras (español, masculino: "UN" ante "MIL"/"MILLÓN"). */
export function enteroALetras(n: number): string {
  if (n === 0) return "CERO";
  const millones = Math.floor(n / 1_000_000);
  const miles = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;
  const partes: string[] = [];
  if (millones) partes.push(millones === 1 ? "UN MILLÓN" : `${apocope(hasta999(millones))} MILLONES`);
  if (miles) partes.push(miles === 1 ? "MIL" : `${apocope(hasta999(miles))} MIL`);
  if (resto) partes.push(hasta999(resto));
  return partes.join(" ");
}

export function lempirasEnLetras(monto: number): string {
  const centavos = Math.round(monto * 100);
  const entero = Math.floor(centavos / 100);
  const cent = String(centavos % 100).padStart(2, "0");
  const palabras = apocope(enteroALetras(entero));
  return `${palabras} ${entero === 1 ? "LEMPIRA" : "LEMPIRAS"} CON ${cent}/100`;
}
