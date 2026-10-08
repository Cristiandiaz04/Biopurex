"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import type { MensajePedido } from "@/lib/datos/pedidos";
import { createClient } from "@/lib/supabase/client";

const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-HN", { hour: "numeric", minute: "2-digit", timeZone: "America/Tegucigalpa" });

/** Chat del pedido en vivo (Supabase Realtime). El cliente escribe; BIOPUREX responde desde el panel. */
export function ChatPedido({ pedidoId, iniciales }: { pedidoId: string; iniciales: MensajePedido[] }) {
  const [mensajes, setMensajes] = useState(iniciales);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fin = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    const canal = supabase
      .channel(`pedido-${pedidoId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "pedido_mensajes", filter: `pedido_id=eq.${pedidoId}` },
        (payload) => {
          const m = payload.new as { id: string; texto: string; de_admin: boolean; creado_en: string };
          setMensajes((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, { id: m.id, texto: m.texto, deAdmin: m.de_admin, creadoEn: m.creado_en }]));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [pedidoId]);

  useEffect(() => {
    fin.current?.scrollIntoView({ block: "nearest" });
  }, [mensajes.length]);

  async function enviar() {
    const t = texto.trim();
    if (!t || enviando) return;
    if (t.length > 1000) return setError("Máximo 1000 caracteres.");
    setEnviando(true);
    setError(null);
    const { data, error: e } = await createClient()
      .from("pedido_mensajes")
      .insert({ pedido_id: pedidoId, texto: t })
      .select("id, texto, de_admin, creado_en")
      .single();
    setEnviando(false);
    if (e || !data) return setError("No se pudo enviar. Intenta de nuevo.");
    setTexto("");
    setMensajes((prev) => (prev.some((x) => x.id === data.id) ? prev : [...prev, { id: data.id, texto: data.texto, deAdmin: data.de_admin, creadoEn: data.creado_en }]));
  }

  return (
    <section className="rounded-lg bg-bg p-[clamp(18px,3vw,28px)] shadow-1">
      <h3 className="mb-4 mt-0 text-[17px] font-bold">Chat del pedido</h3>
      <div className="mb-4 flex max-h-[360px] flex-col gap-2 overflow-y-auto" aria-live="polite">
        {mensajes.length === 0 && <p className="m-0 text-sm text-text-2">¿Tienes dudas sobre este pedido? Escríbenos aquí.</p>}
        {mensajes.map((m) => (
          <div key={m.id} className={`flex max-w-[82%] flex-col gap-1 ${m.deAdmin ? "self-start" : "self-end"}`}>
            <div
              className={`px-3.5 py-2.5 text-sm leading-[1.45] ${
                m.deAdmin ? "rounded-[18px_18px_18px_4px] bg-surface text-navy" : "rounded-[18px_18px_4px_18px] bg-navy text-white"
              }`}
            >
              {m.texto}
            </div>
            <span className={`text-[11px] text-text-2 ${m.deAdmin ? "self-start" : "self-end"}`}>
              {m.deAdmin ? "BIOPUREX · " : ""}
              {hora(m.creadoEn)}
            </span>
          </div>
        ))}
        <div ref={fin} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviar();
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escribe un mensaje…"
          aria-label="Mensaje"
          maxLength={1000}
          className="h-12 min-w-0 flex-1 rounded-full border-[1.5px] border-line px-[18px] text-base text-navy outline-none focus:border-navy"
        />
        <button
          type="submit"
          disabled={enviando || !texto.trim()}
          aria-label="Enviar mensaje"
          className="flex size-12 flex-none items-center justify-center rounded-full bg-navy text-white hover:bg-navy-700 disabled:opacity-50"
        >
          <Send size={20} aria-hidden />
        </button>
      </form>
      {error && <p className="mb-0 mt-2 text-[13px] font-medium text-error">{error}</p>}
    </section>
  );
}
