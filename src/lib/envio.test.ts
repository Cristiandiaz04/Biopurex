import { describe, expect, it } from "vitest";
import { costoEnvio, departamentosConEntrega, faltaParaGratis, resolverZona, zonasActivas, type Municipio } from "./envio";

const M: Municipio[] = [
  { id: "1", departamento: "Cortés", nombre: "San Pedro Sula", costo: 60, activo: true, ciudades: [{ id: "a", nombre: "San Pedro Sula", activo: true }, { id: "b", nombre: "Chamelecón", activo: false }] },
  { id: "2", departamento: "Cortés", nombre: "Choloma", costo: 80, activo: false, ciudades: [{ id: "c", nombre: "Choloma", activo: true }] },
  { id: "3", departamento: "Francisco Morazán", nombre: "Distrito Central", costo: 150, activo: true, ciudades: [] },
];

describe("zonas de entrega", () => {
  it("solo muestra municipios activos con ciudades activas", () => {
    const z = zonasActivas(M);
    expect(z.map((m) => m.nombre)).toEqual(["San Pedro Sula"]);
    expect(z[0].ciudades.map((c) => c.nombre)).toEqual(["San Pedro Sula"]);
    expect(departamentosConEntrega(M)).toEqual(["Cortés"]);
  });
  it("resuelve la zona sin importar mayúsculas y deduce el municipio", () => {
    expect(resolverZona(M, "Cortés", "san pedro sula", "SAN PEDRO SULA")?.ciudad).toBe("San Pedro Sula");
    expect(resolverZona(M, "Cortés", "", "San Pedro Sula")?.municipio.nombre).toBe("San Pedro Sula");
  });
  it("rechaza zonas fuera de la lista o desactivadas", () => {
    expect(resolverZona(M, "Francisco Morazán", "", "Tegucigalpa")).toBeNull();
    expect(resolverZona(M, "Cortés", "Choloma", "Choloma")).toBeNull();
    expect(resolverZona(M, "Cortés", "San Pedro Sula", "Chamelecón")).toBeNull();
  });
});

describe("costo de envío", () => {
  it("es gratis solo si la compra es mayor al mínimo", () => {
    expect(costoEnvio(60, 2000, 2000)).toBe(60);
    expect(costoEnvio(60, 2000.01, 2000)).toBe(0);
    expect(costoEnvio(60, 5000, null)).toBe(60);
  });
  it("calcula cuánto falta", () => {
    expect(faltaParaGratis(1500, 2000)).toBe(500);
    expect(faltaParaGratis(2500, 2000)).toBeNull();
    expect(faltaParaGratis(100, null)).toBeNull();
  });
});
