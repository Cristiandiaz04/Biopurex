"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import { enviarMensajeAdmin } from "@/acciones/admin";
import { createClient } from "@/lib/supabase/client";

type Mensaje = { id: string; texto: string; deAdmin: boolean; creadoEn: string };

const hora = (iso: string) =>
  new Date(iso).toLocaleString("es-HN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Tegucigalpa" });

/** Chat del pedido visto por BIOPUREX (en vivo). */
export function ChatAdmin({ pedidoId, cliente, iniciales }: { pedidoId: string; cliente: string; iniciales: Mensaje[] }) {
  const [mensajes, setMensajes] = useState(iniciales);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fin = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    const canal = supabase
      .channel(`admin-pedido-${pedidoId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pedido_mensajes", filter: `pedido_id=eq.${pedidoId}` }, (payload) => {
        const m = payload.new as { id: string; texto: string; de_admin: boolean; creado_en: string };
        setMensajes((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, { id: m.id, texto: m.texto, deAdmin: m.de_admin, creadoEn: m.creado_en }]));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [pedidoId]);

  useEffect(() => fin.current?.scrollIntoView({ block: "nearest" }), [mensajes.length]);

  async function enviar() {
    const t = texto.trim();
    if (!t || enviando) return;
    setEnviando(true);
    setError(null);
    const r = await enviarMensajeAdmin(pedidoId, t);
    setEnviando(false);
    if (r.error || !r.mensaje) return setError(r.error ?? "No se pudo enviar");
    setTexto("");
    const m = r.mensaje;
    setMensajes((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
  }

  return (
    <div className="rounded-md bg-white shadow-[inset_0_0_0_1px_var(--border)]">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <MessageSquare size={16} aria-hidden />
        <h2 className="m-0 text-base font-bold">Chat con el cliente</h2>
      </div>
      <div className="flex max-h-[420px] min-h-[120px] flex-col gap-2.5 overflow-y-auto p-4" aria-live="polite">
        {mensajes.length === 0 && <div className="py-5 text-center text-sm text-text-2">Sin mensajes en este pedido.</div>}
        {mensajes.map((m) => (
          <div key={m.id} className={`flex flex-col gap-1 ${m.deAdmin ? "items-end" : "items-start"}`}>
            <div className={`max-w-[78%] rounded-md px-3.5 py-2.5 text-sm leading-[1.45] ${m.deAdmin ? "bg-navy text-white" : "bg-surface text-navy"}`}>{m.texto}</div>
            <span className="text-[11px] text-text-2">
              {m.deAdmin ? "BIOPUREX" : cliente} · {hora(m.creadoEn)}
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
        className="flex gap-2 border-t border-line px-4 py-3"
      >
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={1000}
          placeholder="Escribe un mensaje al cliente"
          aria-label="Mensaje"
          className="h-11 min-w-0 flex-1 rounded-full border-[1.5px] border-line px-4 text-sm text-navy outline-none focus:border-navy"
        />
        <button type="submit" disabled={enviando || !texto.trim()} aria-label="Enviar mensaje" className="flex size-11 flex-none items-center justify-center rounded-full bg-navy text-white hover:bg-navy-700 disabled:opacity-50">
          <Send size={16} aria-hidden />
        </button>
      </form>
      {error && <p className="mx-4 mb-3 mt-0 text-[13px] font-semibold text-error">{error}</p>}
    </div>
  );
}
