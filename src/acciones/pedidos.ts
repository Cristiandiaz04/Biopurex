"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Marca el pedido como "Pago en revisión" después de subir el comprobante al bucket. */
export async function registrarComprobante(pedidoId: string, path: string, codigo: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("registrar_comprobante", { p_pedido: pedidoId, p_path: path });
  if (error) {
    console.error("[registrarComprobante]", error.code, error.message);
    return { error: error.code === "P0001" ? error.message : "No pudimos registrar tu comprobante. Intenta de nuevo." };
  }
  revalidatePath(`/pedidos/${codigo}`);
  return { ok: true as const };
}
