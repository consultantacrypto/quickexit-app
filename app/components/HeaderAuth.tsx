"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/src/i18n/navigation";
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
  const t = useTranslations("Navigation");

  if (user) {
    return (
      <div className="flex max-w-[min(100%,22rem)] flex-col gap-1.5 rounded-lg border border-black/10 bg-white px-3 py-1.5 sm:max-w-none sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
          <Link
            href="/dashboard"
            className="flex shrink-0 items-center gap-1 text-[13px] font-medium tracking-wide text-ink transition-colors hover:text-black xl:text-sm"
          >
            <span className="text-sm" aria-hidden>
              ⚡
            </span>
            {t("myAccount")}
          </Link>
          {user.email ? (
            <span
              className="truncate text-[10px] font-semibold normal-case tracking-normal text-neutral-600"
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
          className="shrink-0 text-left text-[12px] font-medium tracking-wide text-neutral-500 transition-colors hover:text-ink sm:text-right"
        >
          {t("signOut")}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpenAuth}
      className="inline-flex min-h-11 items-center justify-center rounded-lg border border-black/15 bg-white px-4 py-2.5 text-[13px] font-medium tracking-wide text-ink transition hover:border-black/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FFD100]"
    >
      {t("signIn")}
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
  const t = useTranslations("Navigation");

  if (user) {
    return (
      <div className="flex w-full flex-col items-center gap-3 rounded-xl border border-[#E7E3DA] bg-white p-5">
        <Link
          href="/dashboard"
          onClick={onCloseMenu}
          className="flex items-center gap-2 text-base font-medium tracking-tight text-ink"
        >
          <span className="text-2xl" aria-hidden>
            ⚡
          </span>
          {t("myAccount")}
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
          className="mt-1 text-sm font-medium tracking-wide text-neutral-500 transition-colors hover:text-ink"
        >
          {t("signOut")}
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
      className="w-full rounded-xl border border-[#E7E3DA] bg-white px-4 py-4 text-center text-base font-medium text-ink"
    >
      {t("signIn")}
    </button>
  );
}
