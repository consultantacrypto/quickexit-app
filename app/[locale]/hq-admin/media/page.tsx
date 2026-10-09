import Link from "next/link";
import { resolveMediaHqPageAuth } from "@/lib/mediaHqServerAuth";
import MediaOpsClient from "./MediaOpsClient";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function HqMediaOrdersPage({ params }: PageProps) {
  const { locale: localeParam } = await params;
  const locale = localeParam === "en" ? "en" : "ro";
  const auth = await resolveMediaHqPageAuth();

  if (auth.status === "anon") {
    return (
      <main className="min-h-screen bg-[#F7F4EC] px-4 py-16 text-center">
        <p className="font-black uppercase tracking-wide text-black">
          {locale === "en" ? "Sign in required" : "Autentificare necesară"}
        </p>
        <Link
          href={`/${locale}/dashboard`}
          className="mt-4 inline-block text-sm font-bold underline"
        >
          Dashboard
        </Link>
      </main>
    );
  }

  if (auth.status === "forbidden") {
    return (
      <main className="min-h-screen bg-[#F7F4EC] px-4 py-16 text-center">
        <p className="font-black uppercase tracking-wide text-red-800">
          {locale === "en" ? "HQ admin only" : "Doar admini HQ"}
        </p>
        <Link
          href={`/${locale}/dashboard`}
          className="mt-4 inline-block text-sm font-bold underline"
        >
          Dashboard
        </Link>
      </main>
    );
  }

  if (auth.status === "error") {
    return (
      <main className="min-h-screen bg-[#F7F4EC] px-4 py-16 text-center">
        <p className="font-black uppercase tracking-wide text-red-800">
          {locale === "en" ? "Authorization error" : "Eroare de autorizare"}
        </p>
      </main>
    );
  }

  // Authorized — client loads operational data only via Bearer API.
  return <MediaOpsClient />;
}
