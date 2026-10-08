"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { registrarComprobante } from "@/app/pedidos/acciones";
import { MensajeError } from "@/components/ui/campo";
import { createClient } from "@/lib/supabase/client";

const TIPOS = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];
const MAX = 5 * 1024 * 1024;

/** Sube la foto del comprobante al bucket privado y pasa el pedido a "Pago en revisión". */
export function SubirComprobante({
  usuarioId,
  pedidoId,
  codigo,
  grande,
}: {
  usuarioId: string;
  pedidoId: string;
  codigo: string;
  grande?: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [estado, setEstado] = useState<"listo" | "subiendo">("listo");
  const [error, setError] = useState<string | null>(null);

  async function subir(archivo: File | undefined) {
    if (!archivo) return;
    setError(null);
    if (!TIPOS.includes(archivo.type)) return setError("Sube una foto (JPG, PNG) o un PDF.");
    if (archivo.size > MAX) return setError("El archivo pesa más de 5 MB.");

    setEstado("subiendo");
    const limpio = archivo.name.normalize("NFD").replace(/[^\w.-]+/g, "_").slice(-60);
    const path = `${usuarioId}/${pedidoId}/${Date.now()}-${limpio}`;
    const { error: e1 } = await createClient().storage.from("comprobantes").upload(path, archivo, { contentType: archivo.type });
    if (e1) {
      setEstado("listo");
      return setError("No pudimos subir el archivo. Revisa tu conexión e intenta de nuevo.");
    }
    const r = await registrarComprobante(pedidoId, path, codigo);
    setEstado("listo");
    if ("error" in r) return setError(r.error ?? "Error");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <label
        className={`relative flex cursor-pointer rounded-md border-2 border-dashed border-line bg-surface transition-colors hover:border-navy ${
          grande ? "flex-col items-center gap-2 px-4 py-6 text-center" : "items-center gap-3.5 p-4"
        } ${estado === "subiendo" ? "pointer-events-none opacity-60" : ""}`}
      >
        <span className={`flex flex-none items-center justify-center rounded-full bg-bg ${grande ? "size-12" : "size-11"}`}>
          <Upload size={20} aria-hidden />
        </span>
        <span>
          <span className="block font-semibold">
            {estado === "subiendo" ? "Subiendo…" : grande ? "Toca para subir una foto" : "Sube la foto de tu comprobante"}
          </span>
          <span className="text-[13px] text-text-2">JPG, PNG o PDF · máximo 5 MB</span>
        </span>
        <input
          ref={input}
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => subir(e.target.files?.[0])}
          className="absolute size-px opacity-0"
        />
      </label>
      {error && <MensajeError>{error}</MensajeError>}
    </div>
  );
}
