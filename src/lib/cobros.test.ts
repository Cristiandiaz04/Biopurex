import { describe, expect, it } from "vitest";
import { documentosPendientes, porTramo, tramoDe } from "./cobros";

const ahora = new Date("2026-10-08T18:00:00Z").getTime();
const docs = [
  { codigo: "BPX-10510", fecha: "2026-10-01T15:00:00Z", total: 1000 }, // 7 días
  { codigo: "BPX-10500", fecha: "2026-08-01T15:00:00Z", total: 500 }, // 68 días
  { codigo: "BPX-10505", fecha: "2026-09-01T15:00:00Z", total: 800 }, // 37 días
];

describe("documentosPendientes", () => {
  it("sin abonos, todo queda pendiente y ordenado del más antiguo", () => {
    const r = documentosPendientes(docs, 2300, ahora);
    expect(r.map((d) => d.codigo)).toEqual(["BPX-10500", "BPX-10505", "BPX-10510"]);
    expect(r.map((d) => d.tramo)).toEqual(["+60", "31-60", "0-30"]);
  });

  it("un abono paga primero el pedido más antiguo", () => {
    // Saldo 1700 → se pagaron 600: cubre el de 500 y 100 del siguiente.
    const r = documentosPendientes(docs, 1700, ahora);
    expect(r.map((d) => [d.codigo, d.abonado, d.pendiente])).toEqual([
      ["BPX-10505", 100, 700],
      ["BPX-10510", 0, 1000],
    ]);
    expect(porTramo(r)).toEqual({ "0-30": 1000, "31-60": 700, "+60": 0 });
  });

  it("saldo cero = cuenta al día", () => {
    expect(documentosPendientes(docs, 0, ahora)).toEqual([]);
  });
});

describe("tramoDe", () => {
  it("límites de los tramos", () => {
    expect([tramoDe(30), tramoDe(31), tramoDe(60), tramoDe(61)]).toEqual(["0-30", "31-60", "31-60", "+60"]);
  });
});
