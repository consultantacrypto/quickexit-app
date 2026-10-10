import Link from "next/link";

type Props = {
  locale: string;
  variant: "anon" | "forbidden" | "error";
};

/**
 * Safe HQ gate UI — no allowlist contents, no near-match hints.
 * Anon and forbidden are distinct; never show both states at once.
 */
export default function HqAdminUnauthorized({ locale, variant }: Props) {
  const lang = locale === "en" ? "en" : "ro";
  const dashboardHref = `/${lang}/dashboard`;

  if (variant === "anon") {
    return (
      <main className="min-h-screen bg-[#F7F4EC] px-4 py-16 text-center">
        <p className="font-black uppercase tracking-wide text-black">
          {lang === "en" ? "Sign in required" : "Autentificare necesară"}
        </p>
        <p className="mt-3 text-sm font-medium text-neutral-600">
          {lang === "en"
            ? "Please sign in to continue."
            : "Conectează-te pentru a continua."}
        </p>
        <Link
          href={dashboardHref}
          className="mt-4 inline-block text-sm font-bold underline"
        >
          Dashboard
        </Link>
      </main>
    );
  }

  if (variant === "error") {
    return (
      <main className="min-h-screen bg-[#F7F4EC] px-4 py-16 text-center">
        <p className="font-black uppercase tracking-wide text-red-800">
          {lang === "en" ? "Access denied." : "Acces refuzat."}
        </p>
        <Link
          href={dashboardHref}
          className="mt-4 inline-block text-sm font-bold underline"
        >
          Dashboard
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F4EC] px-4 py-16 text-center">
      <p className="font-black uppercase tracking-wide text-red-800">
        {lang === "en" ? "Access denied." : "Acces refuzat."}
      </p>
      <Link
        href={dashboardHref}
        className="mt-4 inline-block text-sm font-bold underline"
      >
        Dashboard
      </Link>
    </main>
  );
}
