"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Send, ShieldCheck } from "lucide-react";
import { useNegotiationRoom, type NegotiationMessage } from "@/lib/useNegotiationRoom";

function formatExitPrice(value: number | null | undefined): string | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `€${n.toLocaleString("ro-RO")}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
}

export default function NegociereRoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = typeof params?.id === "string" ? params.id : null;

  const { messages, listing, currentUserId, isLoading, isSending, error, sendMessage } =
    useNegotiationRoom(roomId);

  const [draft, setDraft] = useState("");
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);

  const exitPriceLabel = useMemo(
    () => formatExitPrice(listing?.exit_price),
    [listing?.exit_price]
  );

  // Scroll automat la ultimul mesaj.
  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  const handleSend = async () => {
    const content = draft.trim();
    if (!content || isSending) return;
    const ok = await sendMessage(content);
    if (ok) setDraft("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F4EC] font-sans text-black antialiased selection:bg-[#FFD100] selection:text-black">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-6 md:py-10">
        <button
          onClick={() => router.back()}
          className="mb-4 inline-flex w-fit items-center gap-2 text-[10px] font-black uppercase tracking-widest text-neutral-600 transition-colors hover:text-black"
        >
          <ArrowLeft size={14} /> Înapoi
        </button>

        {/* Container chat — card neo-brutalist */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border-[3px] border-black bg-white shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
          {/* HEADER — detalii activ */}
          <header className="flex items-center justify-between gap-4 border-b-[3px] border-black bg-[#FDFCF8] px-5 py-4 md:px-6">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                Cameră de Negociere
              </p>
              <h1 className="mt-1 truncate text-lg font-black uppercase italic tracking-tight md:text-xl">
                {listing?.title || "Activ Quick Exit"}
              </h1>
            </div>
            {exitPriceLabel ? (
              <div className="shrink-0 rounded-xl border-2 border-black bg-[#FFD100] px-3 py-2 text-center shadow-[3px_3px_0_0_rgba(0,0,0,1)]">
                <p className="text-[9px] font-black uppercase tracking-widest text-black/70">
                  Preț exit
                </p>
                <p className="text-base font-black italic leading-none text-black md:text-lg">
                  {exitPriceLabel}
                </p>
              </div>
            ) : null}
          </header>

          {/* MESAJE */}
          <div className="flex-1 space-y-3 overflow-y-auto bg-white px-4 py-5 md:px-6">
            {isLoading ? (
              <div className="flex h-full items-center justify-center py-20 text-neutral-500">
                <Loader2 className="mr-2 animate-spin" size={18} />
                <span className="text-xs font-black uppercase tracking-widest">
                  Se încarcă conversația...
                </span>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center py-20 text-center">
                <ShieldCheck className="mb-3 text-neutral-300" size={36} />
                <p className="text-sm font-bold text-neutral-600">
                  Niciun mesaj încă. Începe negocierea trimițând primul mesaj.
                </p>
              </div>
            ) : (
              messages.map((msg: NegotiationMessage) => {
                const isMine = currentUserId != null && msg.sender_id === currentUserId;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl border-2 border-black px-4 py-2.5 ${
                        isMine
                          ? "bg-[#FFD100] text-black shadow-[3px_3px_0_0_rgba(0,0,0,1)]"
                          : "bg-[#FDFCF8] text-black shadow-[3px_3px_0_0_rgba(0,0,0,0.15)]"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words text-sm font-semibold leading-relaxed">
                        {msg.content}
                      </p>
                      <p
                        className={`mt-1 text-right text-[9px] font-black uppercase tracking-widest ${
                          isMine ? "text-black/50" : "text-neutral-400"
                        }`}
                      >
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={scrollAnchorRef} />
          </div>

          {/* INPUT */}
          <div className="border-t-[3px] border-black bg-[#FDFCF8] px-4 py-4 md:px-6">
            {error ? (
              <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-red-600">
                {error}
              </p>
            ) : null}
            <div className="flex items-end gap-3">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Scrie un mesaj..."
                className="max-h-32 min-h-[3rem] flex-1 resize-none rounded-xl border-[3px] border-black bg-white px-4 py-3 text-sm font-semibold text-black outline-none transition placeholder:text-neutral-500 focus:border-[#FFD100] focus:ring-4 focus:ring-[#FFD100]/30"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={isSending || !draft.trim()}
                aria-label="Trimite mesaj"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-[3px] border-black bg-black text-[#FFD100] shadow-[3px_3px_0_0_rgba(0,0,0,1)] transition active:translate-y-0.5 active:shadow-none disabled:opacity-40"
              >
                {isSending ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Send size={18} />
                )}
              </button>
            </div>
            <p className="mt-3 text-[10px] font-bold leading-relaxed text-neutral-500">
              Quick Exit facilitează contactul direct între părți. Nu introduce datele cardului
              în mesaje și verifică activul înainte de plată sau predare.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
