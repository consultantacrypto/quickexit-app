"use client";

import { emitOpenConsentPreferences } from "@/lib/consentPreferences";

export default function CookieSettingsButton({
  className,
  children,
}: {
  className?: string;
  children: string;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => emitOpenConsentPreferences()}
    >
      {children}
    </button>
  );
}
