"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useRouter } from "@/src/i18n/navigation";
import { useTranslations } from "next-intl";
import { trackAuthIdentityEvent } from "@/lib/authIdentity/analytics";

function AuthStatusBannerInner() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("Auth");
  const [kind, setKind] = useState<"identity_conflict" | "error" | null>(null);

  useEffect(() => {
    const auth = searchParams.get("auth");
    if (auth !== "identity_conflict" && auth !== "error") return;
    setKind(auth);
    if (auth === "identity_conflict") {
      trackAuthIdentityEvent("identity_link_failed", {
        reason: "identity_owned_elsewhere",
        surface: "auth_status_banner",
      });
    } else {
      trackAuthIdentityEvent("auth_failed", {
        reason: "callback_error",
        surface: "auth_status_banner",
      });
    }
    const params = new URLSearchParams(searchParams.toString());
    params.delete("auth");
    const qs = params.toString();
    // pathname from next/navigation includes locale prefix; strip it for next-intl router.
    const withoutLocale = pathname.replace(/^\/(ro|en)(?=\/|$)/, "") || "/";
    router.replace(qs ? `${withoutLocale}?${qs}` : withoutLocale, { scroll: false });
  }, [searchParams, router, pathname]);

  if (!kind) return null;

  const title =
    kind === "identity_conflict" ? t("identityConflictTitle") : t("authErrorTitle");
  const body =
    kind === "identity_conflict" ? t("identityConflictBody") : t("authErrorBody");

  return (
    <div
      role="alert"
      className="mx-auto mb-4 w-full max-w-3xl rounded-2xl border-[3px] border-black bg-black px-5 py-4 text-[#FFD100] shadow-[6px_6px_0_0_rgba(255,209,0,1)]"
    >
      <p className="text-sm font-black uppercase tracking-wide">{title}</p>
      <p className="mt-2 text-xs font-semibold leading-relaxed text-white/90">{body}</p>
      <button
        type="button"
        className="mt-3 text-[10px] font-black uppercase tracking-widest text-[#FFD100] underline"
        onClick={() => setKind(null)}
      >
        OK
      </button>
    </div>
  );
}

export default function AuthStatusBanner() {
  return (
    <Suspense fallback={null}>
      <AuthStatusBannerInner />
    </Suspense>
  );
}
