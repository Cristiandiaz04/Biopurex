import { describe, expect, it } from "vitest";
import { costoEnvio, departamentosConEntrega, faltaParaGratis, resolverZona, zonasActivas, type Municipio } from "./envio";

const M: Municipio[] = [
  { id: "1", departamento: "Cortés", nombre: "San Pedro Sula", costo: 60, activo: true },
  { id: "2", departamento: "Cortés", nombre: "Choloma", costo: 80, activo: false },
  { id: "3", departamento: "Cortés", nombre: "Villanueva", costo: 90, activo: true },
];

describe("zonas de entrega", () => {
  it("solo muestra municipios activos", () => {
    expect(zonasActivas(M).map((m) => m.nombre)).toEqual(["San Pedro Sula", "Villanueva"]);
    expect(departamentosConEntrega(M)).toEqual(["Cortés"]);
  });
  it("resuelve el municipio sin importar mayúsculas", () => {
    expect(resolverZona(M, "Cortés", "san pedro sula", "Aldea El Carmen")?.nombre).toBe("San Pedro Sula");
  });
  it("sin municipio (dirección vieja) prueba con la ciudad", () => {
    expect(resolverZona(M, "Cortés", "", "Villanueva")?.nombre).toBe("Villanueva");
    expect(resolverZona(M, "Cortés", "", "Cofradía")).toBeNull();
  });
  it("rechaza municipios fuera de la lista o desactivados", () => {
    expect(resolverZona(M, "Cortés", "Choloma", "Choloma")).toBeNull();
    expect(resolverZona(M, "Francisco Morazán", "Distrito Central", "Tegucigalpa")).toBeNull();
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
