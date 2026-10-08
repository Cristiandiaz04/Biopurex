import { describe, expect, it } from "vitest";
import { calcularProduccion, cantidad } from "./unidades";

const materias = [
  { id: "base", nombre: "Base desinfectante", unidad: "kg", stock: 20, costo: 30 },
  { id: "aro", nombre: "Aromatizante lavanda", unidad: "lb", stock: 10.5, costo: 80 },
  { id: "col", nombre: "Colorante morado", unidad: "lb", stock: 10, costo: 40 },
];
// Un lote rinde 4 galones con 2 kg de base, 0.5 lb de aroma y 0.2 lb de colorante.
const receta = { rendimiento: 4, ingredientes: [{ materiaId: "base", cantidad: 2 }, { materiaId: "aro", cantidad: 0.5 }, { materiaId: "col", cantidad: 0.2 }] };

describe("calcularProduccion", () => {
  it("12 galones: consumo y costo (como en la BD)", () => {
    const r = calcularProduccion(receta, 12, materias);
    expect(r.lineas.map((l) => l.necesario)).toEqual([6, 1.5, 0.6]);
    expect(r.costoTotal).toBe(324);
    expect(r.costoUnitario).toBe(27);
    expect(r.faltantes).toEqual([]);
  });

  it("máximo según el stock: la base alcanza para 40 galones", () => {
    expect(calcularProduccion(receta, 1, materias).maximo).toBe(40);
  });

  it("marca lo que falta", () => {
    const r = calcularProduccion(receta, 100, materias);
    expect(r.faltantes.map((f) => f.materiaId)).toEqual(["base", "aro"]);
  });

  it("sin costo en una materia → costo unitario desconocido", () => {
    const r = calcularProduccion(receta, 4, [...materias.slice(0, 2), { ...materias[2], costo: null }]);
    expect(r.sinCosto).toBe(true);
    expect(r.costoUnitario).toBeNull();
  });
});

describe("cantidad", () => {
  it("formatea con unidad", () => {
    expect(cantidad(12.5, "lb")).toBe("12.5 lb");
    expect(cantidad(1, "unidad")).toBe("1 unidad");
    expect(cantidad(1.23456, "kg")).toBe("1.235 kg");
  });
});
