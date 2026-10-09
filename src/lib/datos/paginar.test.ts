import { describe, expect, it } from "vitest";
import { todasLasFilas } from "./paginar";

describe("todasLasFilas", () => {
  it("junta todas las páginas de 1000 hasta que una viene incompleta", async () => {
    const total = 2350;
    const pedidas: [number, number][] = [];
    const filas = await todasLasFilas(async (a, b) => {
      pedidas.push([a, b]);
      return { data: Array.from({ length: Math.max(0, Math.min(b, total - 1) - a + 1) }, (_, i) => a + i), error: null };
    });
    expect(filas).toHaveLength(total);
    expect(pedidas).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
  });
  it("respeta el tope y propaga errores", async () => {
    expect(await todasLasFilas(async (a, b) => ({ data: Array.from({ length: b - a + 1 }, () => 1), error: null }), 3000)).toHaveLength(3000);
    await expect(todasLasFilas(async () => ({ data: null, error: { message: "falló" } }))).rejects.toThrow("falló");
  });
});
