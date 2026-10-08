/*
 * Validación de formularios de la tienda. Se usa en el navegador (mensajes al instante) y en las
 * Server Actions; la base de datos repite las mismas reglas en crear_pedido (defensa final).
 */

export const DEPARTAMENTOS = [
  "Atlántida",
  "Choluteca",
  "Colón",
  "Comayagua",
  "Copán",
  "Cortés",
  "El Paraíso",
  "Francisco Morazán",
  "Gracias a Dios",
  "Intibucá",
  "Islas de la Bahía",
  "La Paz",
  "Lempira",
  "Ocotepeque",
  "Olancho",
  "Santa Bárbara",
  "Valle",
  "Yoro",
] as const;

export type DatosEnvio = {
  nombre: string;
  correo: string;
  telefono: string;
  departamento: string;
  municipio: string;
  ciudad: string;
  colonia: string;
  direccion: string;
  referencia: string;
};

export type Errores<T> = Partial<Record<keyof T, string>>;

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const soloDigitos = (s: string) => s.replace(/\D/g, "");

/** "98765432" → "9876-5432" */
export const formatoTelefono = (s: string) => {
  const d = soloDigitos(s);
  return d.length === 8 ? `${d.slice(0, 4)}-${d.slice(4)}` : s;
};

export function validarEnvio(d: DatosEnvio): Errores<DatosEnvio> {
  const e: Errores<DatosEnvio> = {};
  const largo = (s: string, min: number, max: number) => s.trim().length >= min && s.trim().length <= max;
  if (!largo(d.nombre, 2, 120)) e.nombre = "Ingresa tu nombre completo";
  if (!CORREO.test(d.correo.trim())) e.correo = d.correo.trim() ? "Ingresa un correo válido" : "Este campo es obligatorio";
  if (soloDigitos(d.telefono).length !== 8) e.telefono = d.telefono.trim() ? "El teléfono debe tener 8 dígitos" : "Este campo es obligatorio";
  if (!(DEPARTAMENTOS as readonly string[]).includes(d.departamento)) e.departamento = "Elige un departamento";
  if (!largo(d.municipio, 2, 80)) e.municipio = "Elige tu municipio";
  if (!largo(d.ciudad, 2, 80)) e.ciudad = "Elige tu ciudad";
  if (!largo(d.colonia, 2, 120)) e.colonia = "Este campo es obligatorio";
  if (!largo(d.direccion, 3, 200)) e.direccion = "Este campo es obligatorio";
  if (d.referencia.trim().length > 200) e.referencia = "Máximo 200 caracteres";
  return e;
}

export type DatosCuenta = { nombre: string; correo: string; contrasena: string };

export function validarRegistro(d: DatosCuenta, registro: boolean): Errores<DatosCuenta> {
  const e: Errores<DatosCuenta> = {};
  if (registro && d.nombre.trim().length < 2) e.nombre = "Ingresa tu nombre";
  if (!CORREO.test(d.correo.trim())) e.correo = "Ingresa un correo válido";
  if (d.contrasena.length < 8) e.contrasena = "La contraseña debe tener al menos 8 caracteres";
  return e;
}

export const hayErrores = (e: object) => Object.keys(e).length > 0;
