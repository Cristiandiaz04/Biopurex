import { describe, expect, it } from "vitest";
import { formatoTelefono, hayErrores, validarEnvio, validarRegistro, zonaEnvio, type DatosEnvio } from "./validacion";

const base: DatosEnvio = {
  nombre: "María Fernanda Rápalo",
  correo: "mafer.rapalo@gmail.com",
  telefono: "9876-5432",
  departamento: "Cortés",
  ciudad: "San Pedro Sula",
  colonia: "Jardines del Valle",
  direccion: "5ta calle, 7 ave., casa #12",
  referencia: "",
};

describe("validarEnvio", () => {
  it("acepta datos completos", () => {
    expect(hayErrores(validarEnvio(base))).toBe(false);
  });

  it("pide teléfono de 8 dígitos", () => {
    expect(validarEnvio({ ...base, telefono: "9876-543" }).telefono).toBe("El teléfono debe tener 8 dígitos");
    expect(validarEnvio({ ...base, telefono: "" }).telefono).toBe("Este campo es obligatorio");
  });

  it("rechaza correo y departamento inválidos", () => {
    const e = validarEnvio({ ...base, correo: "mafer@", departamento: "Texas" });
    expect(e.correo).toBe("Ingresa un correo válido");
    expect(e.departamento).toBe("Elige un departamento");
  });

  it("marca campos vacíos de la dirección", () => {
    const e = validarEnvio({ ...base, ciudad: " ", colonia: "", direccion: "" });
    expect(Object.keys(e).sort()).toEqual(["ciudad", "colonia", "direccion"]);
  });
});

describe("zonaEnvio", () => {
  it("San Pedro Sula en Cortés es SPS", () => {
    expect(zonaEnvio("Cortés", "San Pedro Sula")).toBe("sps");
    expect(zonaEnvio("Cortés", "san pedro sula")).toBe("sps");
  });
  it("otra ciudad o departamento es resto del país", () => {
    expect(zonaEnvio("Cortés", "Choloma")).toBe("resto");
    expect(zonaEnvio("Francisco Morazán", "Tegucigalpa")).toBe("resto");
  });
});

describe("validarRegistro", () => {
  it("exige nombre solo al registrarse", () => {
    const d = { nombre: "", correo: "jose@correo.com", contrasena: "12345678" };
    expect(hayErrores(validarRegistro(d, false))).toBe(false);
    expect(validarRegistro(d, true).nombre).toBe("Ingresa tu nombre");
  });
  it("contraseña de al menos 8", () => {
    expect(validarRegistro({ nombre: "José", correo: "jose@correo.com", contrasena: "1234" }, true).contrasena).toBeDefined();
  });
});

describe("formatoTelefono", () => {
  it("agrega el guion", () => expect(formatoTelefono("98765432")).toBe("9876-5432"));
});
