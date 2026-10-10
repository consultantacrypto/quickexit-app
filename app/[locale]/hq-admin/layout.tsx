import type { Metadata } from "next";
import type { ReactNode } from "react";
import { resolveHqAdminPageAuth } from "@/lib/hqAdminPageAuth";
import HqAdminUnauthorized from "@/app/components/HqAdminUnauthorized";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

/**
 * Canonical server gate for every /[locale]/hq-admin/* route.
 * Authority: authenticated session + HQ_ADMIN_EMAILS (fail-closed).
 */
export default async function HqAdminLayout({ children, params }: LayoutProps) {
  const { locale: localeParam } = await params;
  const locale = localeParam === "en" ? "en" : "ro";
  const auth = await resolveHqAdminPageAuth();

  if (auth.status === "anon") {
    return <HqAdminUnauthorized locale={locale} variant="anon" />;
  }
  if (auth.status === "forbidden") {
    return <HqAdminUnauthorized locale={locale} variant="forbidden" />;
  }
  if (auth.status === "error") {
    return <HqAdminUnauthorized locale={locale} variant="error" />;
  }

  return children;
}
