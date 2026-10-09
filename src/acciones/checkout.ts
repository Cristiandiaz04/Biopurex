"use server";

import { updateTag } from "next/cache";
import { obtenerZonas } from "@/lib/datos/catalogo";
import { notificarPedido } from "@/lib/correo-pedidos";
import { resolverZona } from "@/lib/envio";
import { createClient } from "@/lib/supabase/server";
import { hayErrores, soloDigitos, validarEnvio, type DatosEnvio, type Errores } from "@/lib/validacion";
import { registrar, registrarError } from "@/lib/log";

export type ResultadoPedido = { codigo: string } | { error: string; errores?: Errores<DatosEnvio> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function crearPedido(entrada: {
  items: { varianteId: string; cantidad: number }[];
  datos: DatosEnvio;
  guardarDireccion: boolean;
  codigo?: string | null;
}): Promise<ResultadoPedido> {
  const { items, datos, guardarDireccion } = entrada;
  const codigo = entrada.codigo?.trim().toUpperCase() || null;
  if (codigo && !/^[A-Z0-9_-]{3,30}$/.test(codigo)) return { error: "El código de descuento no es válido." };

  const errores = validarEnvio(datos);
  if (hayErrores(errores)) return { error: "Revisa los campos marcados.", errores };
  if (!Array.isArray(items) || items.length === 0) return { error: "Tu carrito está vacío." };
  if (items.length > 50 || items.some((i) => !UUID.test(i.varianteId) || !Number.isInteger(i.cantidad) || i.cantidad < 1 || i.cantidad > 999)) {
    return { error: "Tu carrito tiene datos no válidos. Recarga la página." };
  }

  const zona = resolverZona((await obtenerZonas()).municipios, datos.departamento, datos.municipio, datos.ciudad);
  if (!zona) return { error: "Por ahora no entregamos en esa zona.", errores: { municipio: "Elige tu municipio de la lista" } };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Tu sesión expiró. Vuelve a iniciar sesión." };

  // Precios, envío, stock y estado los decide la base de datos (crear_pedido).
  const { data, error } = await supabase.rpc("crear_pedido", {
    p_items: items.map((i) => ({ variante_id: i.varianteId, cantidad: i.cantidad })),
    p_contacto: { nombre: datos.nombre.trim(), correo: datos.correo.trim(), telefono: soloDigitos(datos.telefono) },
    p_direccion: {
      departamento: datos.departamento,
      municipio: zona.nombre,
      ciudad: datos.ciudad.trim(),
      colonia: datos.colonia.trim(),
      direccion: datos.direccion.trim(),
      referencia: datos.referencia.trim(),
    },
    p_guardar_direccion: guardarDireccion,
    // Solo se envía si hay código: así la compra funciona aunque falte la migración 0004.
    ...(codigo ? { p_codigo: codigo } : {}),
  });

  if (error) {
    // Los mensajes de crear_pedido ya están escritos para el cliente (raise exception '...').
    const conocido = error.code === "P0001";
    registrarError("crearPedido", error);
    return { error: conocido ? error.message : "No pudimos crear tu pedido. Intenta de nuevo en un momento." };
  }

  registrar("pedido_creado", { codigo: data as string, lineas: items.length, con_codigo: !!codigo });
  await notificarPedido(supabase, data as string, "creado");
  updateTag("catalogo");
  return { codigo: data as string };
}

export type ResultadoCodigo = { codigo: string; porcentaje: number } | { error: string };

/** Vista previa del descuento en el checkout. El descuento real lo aplica crear_pedido. */
export async function validarCodigo(codigo: string, subtotal: number): Promise<ResultadoCodigo> {
  const c = codigo.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,30}$/.test(c)) return { error: "Escribe un código válido" };
  if (!Number.isFinite(subtotal) || subtotal < 0) return { error: "Carrito no válido" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("validar_descuento", { p_codigo: c, p_subtotal: subtotal });
  if (error) return { error: error.code === "P0001" ? error.message : "No pudimos validar el código" };
  const fila = (data as { codigo: string | null; porcentaje: number | string | null; error?: string | null }[])[0];
  // Desde 0012 los errores vienen en la fila (así cada intento fallido queda contado).
  if (!fila || fila.error || !fila.codigo) return { error: fila?.error ?? "El código no existe o ya no está activo" };
  return { codigo: fila.codigo, porcentaje: Number(fila.porcentaje) };
}
