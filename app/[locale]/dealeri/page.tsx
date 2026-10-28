import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { companyInfo } from "@/lib/company";
import {
  DEALER_AMOUNT_RON,
  DEALER_CAPACITY_CARS,
  classifyDealerCheckoutSession,
  createQuickExitStripe,
  isDealerCheckoutSessionId,
  type DealerPaymentView,
} from "@/lib/dealerSubscription";
import { getSiteUrl } from "@/lib/siteUrl";
import { resolvePageLocale } from "@/lib/seo";
import { Link } from "@/src/i18n/navigation";
import DealerSubscribeButton from "./DealerSubscribeButton";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    payment?: string | string[];
    session_id?: string | string[];
  }>;
};

const PAGE_TITLE = "Abonament parcuri auto | Quick Exit";
const PAGE_DESCRIPTION =
  "Abonament Quick Exit pentru parcuri auto mici și medii: 600 RON pentru capacitate de listare de aproximativ 10 mașini.";

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const loc = resolvePageLocale(locale);
  const siteUrl = getSiteUrl();
  const canonical = `${siteUrl}/dealeri`;

  return {
    metadataBase: new URL(siteUrl),
    title: { absolute: PAGE_TITLE },
    description: PAGE_DESCRIPTION,
    robots: { index: true, follow: true },
    alternates: {
      canonical,
      languages: {
        ro: canonical,
        en: canonical,
        "x-default": canonical,
      },
    },
    openGraph: {
      title: PAGE_TITLE,
      description: PAGE_DESCRIPTION,
      url: canonical,
      type: "website",
      siteName: "Quick Exit",
      locale: loc === "en" ? "en_GB" : "ro_RO",
      images: [{ url: "/logo.png", alt: "Quick Exit" }],
    },
    twitter: {
      card: "summary_large_image",
      title: PAGE_TITLE,
      description: PAGE_DESCRIPTION,
      images: ["/logo.png"],
    },
  };
}

async function resolveDealerView(payment: string, sessionId: string): Promise<DealerPaymentView> {
  if (payment === "cancel") return { state: "cancel" };
  if (payment !== "success") return { state: "offer" };
  if (!isDealerCheckoutSessionId(sessionId)) return { state: "mismatch" };

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return { state: "pending" };

  try {
    const stripe = createQuickExitStripe(secret);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return classifyDealerCheckoutSession(session);
  } catch {
    return { state: "pending" };
  }
}

function StatusPanel({ view }: { view: DealerPaymentView }) {
  if (view.state === "offer") return null;

  if (view.state === "success") {
    return (
      <div
        role="status"
        className="mb-6 border-[3px] border-black bg-[#FFD100] p-5 shadow-[6px_6px_0_0_rgba(0,0,0,1)]"
      >
        <p className="text-xs font-black uppercase tracking-[0.18em]">Plată confirmată</p>
        <h2 className="mt-2 text-2xl font-black uppercase italic tracking-tight">
          Abonamentul de parc auto este înregistrat
        </h2>
        <p className="mt-3 text-sm font-bold leading-relaxed">
          Am primit {DEALER_AMOUNT_RON} RON pentru capacitatea de aproximativ {DEALER_CAPACITY_CARS}{" "}
          mașini. Quick Exit activează listarea și te contactează
          {view.email ? (
            <>
              {" "}
              la <span className="break-all">{view.email}</span>
            </>
          ) : (
            " pe adresa folosită la plată"
          )}
          .
        </p>
      </div>
    );
  }

  if (view.state === "cancel") {
    return (
      <div
        role="status"
        className="mb-6 border-[3px] border-black bg-white p-5 shadow-[6px_6px_0_0_rgba(0,0,0,1)]"
      >
        <h2 className="text-xl font-black uppercase italic tracking-tight">Plata a fost întreruptă</h2>
        <p className="mt-2 text-sm font-bold leading-relaxed text-neutral-700">
          Nicio sumă nu a fost încasată. Poți relua abonamentul când ești gata.
        </p>
      </div>
    );
  }

  if (view.state === "pending") {
    return (
      <div
        role="status"
        className="mb-6 border-[3px] border-black bg-white p-5 shadow-[6px_6px_0_0_rgba(0,0,0,1)]"
      >
        <h2 className="text-xl font-black uppercase italic tracking-tight">Plata se confirmă</h2>
        <p className="mt-2 text-sm font-bold leading-relaxed text-neutral-700">
          Dacă ai plătit deja, păstrează emailul de la Stripe. Dacă ai închis fereastra înainte de
          plată, poți relua mai jos.
        </p>
      </div>
    );
  }

  return (
    <div
      role="status"
      className="mb-6 border-[3px] border-black bg-white p-5 shadow-[6px_6px_0_0_rgba(0,0,0,1)]"
    >
      <h2 className="text-xl font-black uppercase italic tracking-tight">Nu am putut confirma plata</h2>
      <p className="mt-2 text-sm font-bold leading-relaxed text-neutral-700">
        Linkul nu corespunde abonamentului de {DEALER_AMOUNT_RON} RON. Dacă ai plătit, păstrează
        confirmarea Stripe și scrie-ne la {companyInfo.publicEmail}.
      </p>
    </div>
  );
}

export default async function DealeriPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const view = await resolveDealerView(firstParam(sp.payment), firstParam(sp.session_id));
  const siteUrl = getSiteUrl();
  const offerJsonLd = {
    "@context": "https://schema.org",
    "@type": "Offer",
    name: "Abonament parc auto — aproximativ 10 mașini",
    description: PAGE_DESCRIPTION,
    price: String(DEALER_AMOUNT_RON),
    priceCurrency: "RON",
    url: `${siteUrl}/dealeri`,
    seller: {
      "@type": "Organization",
      name: companyInfo.brandName,
    },
  };

  return (
    <div
      data-dealer-page
      data-dealer-state={view.state}
      className="bg-[#F7F4EC] pb-20 font-sans text-black antialiased selection:bg-black selection:text-[#FFD100]"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(offerJsonLd) }}
      />
      <div className="mx-auto max-w-3xl px-4 pt-8 md:px-8 md:pt-12">
        <section className="mb-8 border-[3px] border-black bg-black px-5 py-7 text-white shadow-[8px_8px_0_0_#FFD100] md:px-8 md:py-9">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#FFD100]">
            Quick Exit · Parcuri auto
          </p>
          <h1 className="mt-3 text-3xl font-black uppercase italic leading-tight tracking-tight sm:text-4xl md:text-5xl">
            Abonament pentru{" "}
            <span className="inline-block bg-[#FFD100] px-2 py-1 text-black">parcul tău</span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-neutral-200 md:text-base">
            Pentru parcuri auto mici și medii. Un abonament Quick Exit, cu capacitate de listare
            pentru aproximativ {DEALER_CAPACITY_CARS} mașini.
          </p>
        </section>

        <StatusPanel view={view} />

        <section className="border-[3px] border-black bg-white p-6 shadow-[10px_10px_0_0_#FFD100] md:p-8">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-neutral-500">
            Pachet parc auto
          </p>
          <p className="mt-3 text-5xl font-black italic tracking-tighter md:text-6xl">
            <span data-dealer-price>{DEALER_AMOUNT_RON} RON</span>
          </p>
          <p className="mt-2 text-sm font-black uppercase tracking-wide">
            Aproximativ {DEALER_CAPACITY_CARS} mașini
          </p>
          <ul className="mt-6 space-y-3 text-sm font-bold text-neutral-800">
            <li className="flex gap-2">
              <span className="text-[#FFD100]" aria-hidden>
                ✓
              </span>
              Capacitate de listare pentru aproximativ {DEALER_CAPACITY_CARS} mașini
            </li>
            <li className="flex gap-2">
              <span className="text-[#FFD100]" aria-hidden>
                ✓
              </span>
              Un singur abonament pentru parcul auto, nu pentru fiecare anunț
            </li>
            <li className="flex gap-2">
              <span className="text-[#FFD100]" aria-hidden>
                ✓
              </span>
              Plată pe loc, cu cardul, după ce răspunzi la mesajul Quick Exit
            </li>
          </ul>

          {view.state === "success" ? (
            <p className="mt-6 text-sm font-bold text-neutral-700">
              Dacă ai o întrebare despre activare, scrie la{" "}
              <a className="underline decoration-[#FFD100] decoration-4 underline-offset-4" href={`mailto:${companyInfo.publicEmail}`}>
                {companyInfo.publicEmail}
              </a>
              .
            </p>
          ) : (
            <DealerSubscribeButton />
          )}
        </section>

        <p className="mt-8 text-sm font-semibold text-neutral-700">
          Prețul acestui abonament este {DEALER_AMOUNT_RON} RON pentru aproximativ{" "}
          {DEALER_CAPACITY_CARS} mașini.{" "}
          <Link href="/tarife" className="font-black underline decoration-[#FFD100] decoration-4 underline-offset-4">
            Anunțurile individuale au tarife separate
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
