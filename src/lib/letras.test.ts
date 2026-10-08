import { describe, expect, it } from "vitest";
import { enteroALetras, lempirasEnLetras } from "./letras";

describe("enteroALetras", () => {
  it.each([
    [0, "CERO"],
    [1, "UNO"],
    [15, "QUINCE"],
    [21, "VEINTIUNO"],
    [45, "CUARENTA Y CINCO"],
    [100, "CIEN"],
    [101, "CIENTO UNO"],
    [250, "DOSCIENTOS CINCUENTA"],
    [1000, "MIL"],
    [1250, "MIL DOSCIENTOS CINCUENTA"],
    [21000, "VEINTIÚN MIL"],
    [100000, "CIEN MIL"],
    [1000000, "UN MILLÓN"],
    [2500000, "DOS MILLONES QUINIENTOS MIL"],
  ])("%i → %s", (n, txt) => expect(enteroALetras(n)).toBe(txt));
});

describe("lempirasEnLetras", () => {
  it("con centavos", () => expect(lempirasEnLetras(1250.5)).toBe("MIL DOSCIENTOS CINCUENTA LEMPIRAS CON 50/100"));
  it("un lempira", () => expect(lempirasEnLetras(1)).toBe("UN LEMPIRA CON 00/100"));
  it("veintiún", () => expect(lempirasEnLetras(21)).toBe("VEINTIÚN LEMPIRAS CON 00/100"));
  it("redondea centavos", () => expect(lempirasEnLetras(316.499)).toBe("TRESCIENTOS DIECISÉIS LEMPIRAS CON 50/100"));
});
