import "server-only";
import { createClient } from "@/lib/supabase/server";

export type TipoCliente = "normal" | "contra_entrega" | "credito";

export type Perfil = {
  id: string;
  nombre: string;
  correo: string;
  telefono: string | null;
  rol: "cliente" | "admin";
  tipoCliente: TipoCliente;
};

export type Direccion = {
  id: string;
  etiqueta: string;
  nombre: string;
  telefono: string;
  departamento: string;
  ciudad: string;
  colonia: string;
  direccion: string;
  referencia: string | null;
  predeterminada: boolean;
};

/** Perfil del usuario con sesión (o null). Lee cookies: llamar dentro de <Suspense>. */
export async function obtenerPerfil(): Promise<Perfil | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase
    .from("perfiles")
    .select("id, nombre, correo, telefono, rol, tipo_cliente")
    .eq("id", auth.user.id)
    .single();
  if (!data) return null;
  return {
    id: data.id,
    nombre: data.nombre,
    correo: data.correo,
    telefono: data.telefono,
    rol: data.rol,
    tipoCliente: data.tipo_cliente,
  };
}

export async function obtenerDirecciones(): Promise<Direccion[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("direcciones")
    .select("id, etiqueta, nombre, telefono, departamento, ciudad, colonia, direccion, referencia, predeterminada")
    .order("predeterminada", { ascending: false })
    .order("creado_en");
  return data ?? [];
}
