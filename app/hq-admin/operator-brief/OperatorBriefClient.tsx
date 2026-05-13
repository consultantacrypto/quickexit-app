"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { renderOperatorBriefMarkdown } from "@/lib/operatorBriefMarkdown";

const ADMIN_EMAILS = ["consultantacrypto.ro@gmail.com"];

type GateState = "loading" | "anon" | "forbidden" | "ready";

function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

type Props = {
  initialContent: string;
  readError: string | null;
};

export default function OperatorBriefClient({ initialContent, readError }: Props) {
  const [gate, setGate] = useState<GateState>("loading");

  const init = useCallback(async () => {
    setGate("loading");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setGate("anon");
      return;
    }
    if (!isAdminEmail(user.email)) {
      setGate("forbidden");
      return;
    }
    setGate("ready");
  }, []);

  useEffect(() => {
    void init();
  }, [init]);

  if (gate === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F4EC] px-6 font-sans antialiased">
        <div className="w-full max-w-md rounded-[2rem] border-[3px] border-black bg-white p-10 text-center shadow-[12px_12px_0_0_#FFD100]">
          <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-[3px] border-neutral-200 border-t-black" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600">Se verifică accesul…</p>
        </div>
      </div>
    );
  }

  if (gate === "anon") {
    return (
      <div className="min-h-screen bg-[#F7F4EC] px-4 py-20 font-sans antialiased md:px-8">
        <div className="mx-auto max-w-lg rounded-[2rem] border-[3px] border-black bg-white p-10 text-center shadow-[12px_12px_0_0_#FFD100]">
          <h1 className="text-xl font-black uppercase italic text-black">Acces restricționat</h1>
          <p className="mt-4 text-sm font-medium text-neutral-600">Autentifică-te pentru a continua.</p>
          <Link
            href="/"
            className="mt-8 inline-block w-full rounded-2xl border-[3px] border-black bg-black py-4 text-xs font-black uppercase tracking-widest text-[#FFD100] transition hover:brightness-110"
          >
            Înapoi la pagina principală
          </Link>
        </div>
      </div>
    );
  }

  if (gate === "forbidden") {
    return (
      <div className="min-h-screen bg-[#F7F4EC] px-4 py-20 font-sans antialiased md:px-8">
        <div className="mx-auto max-w-lg rounded-[2rem] border-[3px] border-black bg-white p-10 text-center shadow-[12px_12px_0_0_#FFD100]">
          <h1 className="text-xl font-black uppercase italic text-black">Acces refuzat</h1>
          <p className="mt-4 text-sm font-medium text-neutral-600">Nu ai acces la această zonă.</p>
          <Link
            href="/"
            className="mt-8 inline-block w-full rounded-2xl border-[3px] border-black bg-white py-4 text-xs font-black uppercase tracking-widest text-black shadow-[4px_4px_0_0_#000] transition hover:bg-neutral-50"
          >
            Înapoi la pagina principală
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F4EC] px-4 pb-28 pt-20 font-sans text-neutral-900 antialiased selection:bg-[#FFD100]/40 md:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-neutral-500">HQ Admin</p>
            <h1 className="text-3xl font-black uppercase italic leading-tight tracking-tight text-black md:text-4xl">
              Operator Brief
            </h1>
            <p className="max-w-2xl text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
              Priorități, riscuri și taskuri propuse pentru operarea Quick Exit.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border-2 border-black bg-[#FFD100] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-black">
                Read-only
              </span>
              <span className="rounded-full border-2 border-black/30 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-wider text-neutral-700">
                Demo fictiv
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <Link
              href="/hq-admin"
              className="rounded-2xl border-[3px] border-black bg-black px-4 py-2 text-center text-[10px] font-black uppercase tracking-widest text-[#FFD100] shadow-[3px_3px_0_0_rgba(255,209,0,0.9)] transition hover:brightness-110"
            >
              Înapoi la HQ Admin
            </Link>
            <Link
              href="/hq-admin/bmk-lab"
              className="rounded-2xl border-2 border-black/30 bg-white px-4 py-2 text-center text-[10px] font-black uppercase tracking-widest text-neutral-800 transition hover:border-black"
            >
              Vezi BMK Lab
            </Link>
          </div>
        </div>

        <div className="rounded-[2rem] border-[3px] border-black bg-amber-50/90 px-5 py-4 text-sm font-medium leading-relaxed text-neutral-900 shadow-[4px_4px_0_0_rgba(0,0,0,0.08)]">
          <p>
            Acest brief este <strong>demonstrativ</strong> și nu conține date reale. Operatorul propune taskuri, dar{" "}
            <strong>nicio acțiune nu este executată automat</strong>.
          </p>
        </div>

        <div className="rounded-2xl border-2 border-black/15 bg-white/90 px-5 py-4 text-sm font-medium text-neutral-700">
          <p>
            <strong>HQ Copilot</strong> oferă insight live în tab-ul dedicat. <strong>Operator Brief</strong> organizează
            munca în <strong>taskuri propuse</strong> pentru review — fără decizii sau execuții automate din această pagină.
          </p>
        </div>

        {readError ? (
          <div className="rounded-[2rem] border-[3px] border-red-800/40 bg-red-50 px-6 py-8 text-center text-sm font-semibold text-red-900">
            {readError}
          </div>
        ) : (
          <article className="rounded-[2rem] border-[3px] border-black bg-white p-6 shadow-[8px_8px_0_0_rgba(0,0,0,0.06)] md:p-10 md:shadow-[10px_10px_0_0_#FFD100]/80">
            {renderOperatorBriefMarkdown(initialContent)}
          </article>
        )}
      </div>
    </div>
  );
}
