"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export type HeaderAuthUser = {
  id: string;
  email?: string | null;
} | null;

function scheduleDeferredAuthInit(run: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;

  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(run, { timeout: 2000 });
    return () => window.cancelIdleCallback(id);
  }

  const timeoutId = window.setTimeout(run, 1);
  return () => window.clearTimeout(timeoutId);
}

export function useHeaderAuth() {
  const [user, setUser] = useState<HeaderAuthUser>(null);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;

    const cancelScheduled = scheduleDeferredAuthInit(() => {
      void supabase.auth.getSession().then(({ data: { session } }) => {
        const sessionUser = session?.user;
        setUser(
          sessionUser
            ? { id: sessionUser.id, email: sessionUser.email ?? null }
            : null
        );
      });

      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        const sessionUser = session?.user;
        setUser(
          sessionUser
            ? { id: sessionUser.id, email: sessionUser.email ?? null }
            : null
        );
      });
      subscription = data.subscription;
    });

    return () => {
      cancelScheduled();
      subscription?.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return { user, logout };
}

type HeaderAuthDesktopProps = {
  user: HeaderAuthUser;
  onOpenAuth: () => void;
  onLogout: () => void;
};

export function HeaderAuthDesktop({ user, onOpenAuth, onLogout }: HeaderAuthDesktopProps) {
  if (user) {
    return (
      <div className="flex max-w-[min(100%,22rem)] flex-col gap-1.5 rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-2 shadow-[2px_2px_0_0_rgba(0,0,0,0.1)] sm:max-w-none sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
          <Link
            href="/dashboard"
            className="flex shrink-0 items-center gap-1 text-[10px] font-black uppercase tracking-widest text-black italic transition-colors hover:text-[#FFD100]"
          >
            <span className="text-sm" aria-hidden>
              ⚡
            </span>
            Contul meu
          </Link>
          {user.email ? (
            <span
              className="truncate text-[9px] font-semibold normal-case tracking-normal text-neutral-600"
              title={user.email}
            >
              {user.email}
            </span>
          ) : null}
        </div>
        <div className="hidden h-4 w-[2px] bg-gray-200 sm:block" aria-hidden />
        <button
          type="button"
          onClick={() => void onLogout()}
          className="shrink-0 text-left text-[9px] font-black uppercase tracking-widest text-gray-500 italic transition-colors hover:text-red-600 sm:text-right"
        >
          Ieși din cont
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpenAuth}
      className="mx-2 rounded-xl border-2 border-black bg-[#FFD100] px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-black shadow-[3px_3px_0_0_rgba(0,0,0,1)] transition hover:-translate-y-px hover:brightness-105"
    >
      Intră în cont
    </button>
  );
}

type HeaderAuthMobileProps = {
  user: HeaderAuthUser;
  onOpenAuth: () => void;
  onLogout: () => void;
  onCloseMenu: () => void;
};

export function HeaderAuthMobile({
  user,
  onOpenAuth,
  onLogout,
  onCloseMenu,
}: HeaderAuthMobileProps) {
  if (user) {
    return (
      <div className="flex w-full flex-col items-center gap-3 rounded-[2rem] border-2 border-gray-100 bg-gray-50 p-5">
        <Link
          href="/dashboard"
          onClick={onCloseMenu}
          className="flex items-center gap-2 text-xl font-black uppercase tracking-widest italic text-black"
        >
          <span className="text-2xl" aria-hidden>
            ⚡
          </span>
          Contul meu
        </Link>
        {user.email ? (
          <p
            className="max-w-full truncate px-2 text-center text-xs font-semibold normal-case text-neutral-600"
            title={user.email}
          >
            {user.email}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => {
            void onLogout();
            onCloseMenu();
          }}
          className="mt-1 text-sm font-black uppercase tracking-widest text-red-600 transition-colors hover:text-red-800 italic"
        >
          Ieși din cont
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        onCloseMenu();
        onOpenAuth();
      }}
      className="w-full rounded-[2rem] border-4 border-black bg-[#FFD100] py-5 text-lg font-black uppercase tracking-widest italic shadow-[6px_6px_0_0_rgba(0,0,0,1)]"
    >
      Intră în cont
    </button>
  );
}
