import Image from "next/image";
import { Link } from "@/src/i18n/navigation";
import { WALLET_OUTBOUND_REL } from "@/lib/walletCatalog";
import type { WalletSeoLanding, WalletSeoLink } from "@/lib/walletSeoLandings";
import CopyCheckoutCode from "./CopyCheckoutCode";

const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black";

function localePath(href: string): string {
  return href.startsWith("/ro/") ? href.slice(3) : href;
}

function TextLink({ link }: { link: WalletSeoLink }) {
  if (link.external) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        className={`font-semibold text-neutral-950 underline decoration-black/30 underline-offset-4 ${FOCUS}`}
      >
        {link.label}
        <span className="sr-only"> (se deschide într-o filă nouă)</span>
      </a>
    );
  }
  return (
    <Link href={localePath(link.href)} className={`font-semibold text-neutral-950 underline decoration-black/30 underline-offset-4 ${FOCUS}`}>
      {link.label}
    </Link>
  );
}

export default function WalletSeoLandingView({ landing }: { landing: WalletSeoLanding }) {
  const { labels } = landing;

  return (
    <article className="bg-[#F7F4EC] pb-20 text-neutral-950">
      <div className="mx-auto max-w-3xl px-4 md:px-8">
        <p className="text-sm">
          <Link href="/wallets" className={`font-semibold text-neutral-800 underline decoration-black/20 underline-offset-4 ${FOCUS}`}>
            {labels.catalogLabel}
          </Link>
        </p>

        <header className="mt-4">
          <h1 className="text-3xl font-black tracking-tight text-neutral-950 md:text-5xl">{landing.h1}</h1>
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-neutral-800 md:text-base">
            {landing.intro.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </header>

        <p className="mt-6 text-sm leading-relaxed text-neutral-800">{landing.disclosureShort}</p>

        <section className="mt-8" aria-labelledby="wallet-seo-prices">
          <h2 id="wallet-seo-prices" className="text-xl font-black tracking-tight">
            {landing.priceHeading}
          </h2>
          <ul className="mt-3 divide-y divide-black/10 border-y border-black/10">
            {landing.lines.map((line) => (
              <li key={line.slug} className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  {line.imageSrc ? (
                    <Image
                      src={line.imageSrc}
                      alt={line.imageAlt}
                      width={80}
                      height={64}
                      unoptimized
                      className="h-16 w-20 shrink-0 object-contain"
                    />
                  ) : null}
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-600">{line.brand}</p>
                    <h3 className="text-base font-semibold leading-snug">{line.name}</h3>
                    {line.badge ? (
                      <p className="mt-1 inline-flex rounded-full border border-black/15 bg-white px-2 py-0.5 text-[11px] font-semibold">
                        {line.badge}
                      </p>
                    ) : null}
                    {line.primary ? (
                      <p className="mt-2 text-sm font-semibold">
                        {line.priceIsFrom ? <span className="mr-1 font-medium text-neutral-700">{labels.fromPrefix}</span> : null}
                        {line.primary}
                      </p>
                    ) : (
                      <p className="mt-2 text-sm text-neutral-800">{line.priceOnRequest}</p>
                    )}
                    {line.secondaryLabel ? <p className="text-xs leading-snug text-neutral-700">{line.secondaryLabel}</p> : null}
                    {line.checkedLabel ? <p className="text-xs text-neutral-700">{line.checkedLabel}</p> : null}
                  </div>
                </div>
                <a
                  href={line.outboundUrl}
                  target="_blank"
                  rel={WALLET_OUTBOUND_REL}
                  className={`inline-flex min-h-12 w-full shrink-0 items-center justify-center rounded-2xl bg-neutral-950 px-4 text-center text-[11px] font-bold uppercase tracking-widest text-white hover:bg-[#FFD100] hover:text-neutral-950 sm:w-auto ${FOCUS}`}
                >
                  {labels.buyOfficial}
                  <span className="sr-only">
                    {" "}
                    {line.name} ({labels.newTab})
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        {landing.checkoutCodes.length > 0 ? (
          <section className="mt-6 rounded-2xl border border-black/10 bg-white p-4" aria-label={labels.codeLabel}>
            {landing.checkoutCodes.map((code) => (
              <div key={code} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-relaxed text-neutral-800">
                  {labels.codeLabel}: <span className="font-mono font-semibold text-neutral-950">{code}</span>
                  <span className="mt-1 block text-neutral-700">{labels.applyCode}</span>
                </p>
                <CopyCheckoutCode code={code} copyLabel={labels.copyCode} copiedLabel={labels.copied} />
              </div>
            ))}
          </section>
        ) : null}

        {landing.sources.length > 0 ? (
          <section className="mt-8" aria-labelledby="wallet-seo-sources">
            <h2 id="wallet-seo-sources" className="text-sm font-semibold">
              {labels.sourcesLabel}
            </h2>
            <ul className="mt-2 space-y-2 text-sm">
              {landing.sources.map((link) => (
                <li key={link.href}>
                  <TextLink link={link} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-8" aria-label={labels.disclosureLabel}>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-700">{labels.disclosureLabel}</h2>
          <p className="mt-3 text-sm leading-relaxed text-neutral-800">{landing.disclosure}</p>
        </section>

        <nav className="mt-8" aria-label={labels.relatedTitle}>
          <h2 className="text-sm font-semibold">{labels.relatedTitle}</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {landing.related.map((link) => (
              <li key={link.href}>
                {link.external ? (
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex min-h-11 items-center rounded-full border border-black/15 bg-white px-3 text-sm font-semibold ${FOCUS}`}
                  >
                    {link.label}
                    <span className="sr-only"> (se deschide într-o filă nouă)</span>
                  </a>
                ) : (
                  <Link
                    href={localePath(link.href)}
                    className={`inline-flex min-h-11 items-center rounded-full border border-black/15 bg-white px-3 text-sm font-semibold ${FOCUS}`}
                  >
                    {link.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <section className="mt-10" aria-labelledby="wallet-seo-faq">
          <h2 id="wallet-seo-faq" className="text-xl font-black tracking-tight">
            {labels.faqTitle}
          </h2>
          <div className="mt-3 divide-y divide-black/10 border-y border-black/10">
            {landing.faqs.map((faq) => (
              <details key={faq.question} className="group py-1">
                <summary className={`cursor-pointer py-3 text-sm font-semibold ${FOCUS}`}>{faq.question}</summary>
                <p className="pb-4 text-sm leading-relaxed text-neutral-800">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </article>
  );
}
