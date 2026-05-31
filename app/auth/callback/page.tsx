"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Se finalizează autentificarea…");

  useEffect(() => {
    const nextRaw = searchParams.get("next");
    const next = nextRaw?.startsWith("/") ? nextRaw : "/dashboard";

    const finish = async () => {
      const code = searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error("[auth/callback] exchangeCodeForSession:", error.message);
          setMessage("Nu am putut valida sesiunea.");
          router.replace("/?auth=error");
          return;
        }
        router.replace(next);
        return;
      }

      // Flux hash / sesiune deja în URL (detectSessionInUrl implicit pe client).
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error || !session) {
        console.error("[auth/callback] getSession:", error?.message ?? "no session");
        setMessage("Link invalid sau expirat.");
        router.replace("/?auth=error");
        return;
      }
      router.replace(next);
    };

    void finish();
  }, [router, searchParams]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4">
      <p className="text-sm font-medium text-neutral-600">{message}</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center px-4">
          <p className="text-sm text-neutral-500">Se încarcă…</p>
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  );
}
