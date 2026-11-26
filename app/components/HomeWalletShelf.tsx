import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/src/i18n/navigation";
import { WALLET_BRANDS, type WalletBrandProfile } from "@/lib/walletBrands";
import { brandStartingPrice } from "@/lib/walletBrandSpecs";
import type { WalletBrandSlug, WalletLocale } from "@/lib/walletCatalog";

/** Homepage shelf order. Images and prices stay in the wallet catalog. */
const FEATURED_BRANDS = ["tangem", "ledger", "trezor", "safepal", "keystone"] as const satisfies readonly WalletBrandSlug[];

const CARD_LINK =
  "inline-flex min-h-11 w-full min-w-0 items-center justify-center gap-2 rounded-2xl border-[3px] border-black bg-[#FFD100] px-3 py-2.5 text-center text-[11px] font-black uppercase leading-tight tracking-widest text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition duration-200 hover:-translate-y-0.5 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black motion-reduce:transition-none motion-reduce:hover:translate-y-0";

function CryptoWalletIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" aria-hidden="true" fill="none">
      <rect x="2.75" y="7" width="18.5" height="12" rx="2.25" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7 7V5.7A1.7 1.7 0 0 1 8.7 4h6.6A1.7 1.7 0 0 1 17 5.7V7" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="13" r="1.55" fill="currentColor" />
    </svg>
  );
}

function featuredBrands(): WalletBrandProfile[] {
  return FEATURED_BRANDS.flatMap((slug) => {
    const brand = WALLET_BRANDS.find((item) => item.slug === slug);
    return brand ? [brand] : [];
  });
}

function splitHighlight(full: string, highlight: string) {
  const index = full.toLowerCase().indexOf(highlight.toLowerCase());
  if (index < 0) return { before: full, highlight: "", after: "" };
  return {
    before: full.slice(0, index),
    highlight: full.slice(index, index + highlight.length),
    after: full.slice(index + highlight.length),
  };
}

export default async function HomeWalletShelf({ locale }: { locale: WalletLocale }) {
  const t = await getTranslations("Home");
  const tPrice = await getTranslations("Wallets");
  const title = splitHighlight(t("wallets.title"), t("wallets.titleHighlight"));
  const brands = featuredBrands();

  return (
    <section
      id="recommended-crypto-wallets"
      aria-labelledby="recommended-crypto-wallets-title"
      className="relative overflow-hidden border-t border-black bg-[linear-gradient(128deg,#121212_0%,#1c1a16_46%,#3d320e_100%)] py-16 text-white md:py-24"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70 [background-image:linear-gradient(rgba(255,209,0,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,209,0,0.08)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_70%_30%,#000_6%,transparent_72%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-36 w-[min(52rem,80%)] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(255,209,0,0.28),transparent_68%)] blur-2xl"
      />

      <div className="relative mx-auto max-w-[1440px] px-4 md:px-8">
        <div className="mb-8 max-w-3xl md:mb-10">
          <h2
            id="recommended-crypto-wallets-title"
            className="text-3xl font-black uppercase italic tracking-tight text-white md:text-4xl"
          >
            {title.before}
            <span className="text-[#FFD100]">{title.highlight}</span>
            {title.after}
          </h2>
          <p className="mt-3 max-w-2xl text-xs font-medium leading-relaxed text-[#FFE56A] md:text-[13px]">
            {t("wallets.disclosure")}
          </p>
        </div>

        <div className="-mx-4 flex snap-x snap-mandatory scroll-ps-4 scroll-pe-8 gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none] md:-mx-8 md:scroll-ps-8 md:px-8 lg:mx-0 lg:grid lg:snap-none lg:grid-cols-5 lg:gap-5 lg:overflow-visible lg:scroll-ps-0 lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden">
          {brands.map((brand) => {
            const price = brandStartingPrice(brand.slug, locale);
            const alt = locale === "en" ? brand.image.altEn : brand.image.altRo;
            const href = `/wallets#brand-${brand.slug}`;
            return (
              <article
                key={brand.slug}
                className="flex w-[78%] max-w-[78%] min-w-0 shrink-0 snap-start flex-col rounded-3xl border-[3px] border-black bg-white text-black shadow-[6px_6px_0_0_#FFD100] lg:w-auto lg:max-w-none"
              >
                <div className="relative aspect-[5/4] overflow-hidden rounded-t-[1.35rem] bg-[#F7F4EC]">
                  <Image
                    src={brand.image.src}
                    alt={alt}
                    fill
                    loading="lazy"
                    fetchPriority="low"
                    sizes="(max-width: 1023px) 78vw, 240px"
                    className="object-contain p-3"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-3 p-4 md:p-5">
                  <h3 className="text-lg font-semibold leading-snug tracking-tight text-ink">{brand.name}</h3>
                  {price ? (
                    <p className="text-xl font-bold leading-none tracking-tight text-ink">
                      {price.from ? (
                        <span className="mr-1 text-[11px] font-medium uppercase tracking-wider text-muted">
                          {tPrice("fromPrefix")}
                        </span>
                      ) : null}
                      {price.text}
                    </p>
                  ) : null}
                  <Link href={href} className={`mt-auto ${CARD_LINK}`}>
                    <CryptoWalletIcon />
                    <span className="min-w-0 text-balance">{t("wallets.cardCta")}</span>
                  </Link>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-8 flex justify-center md:mt-10 md:justify-end">
          <Link href="/wallets" className={`${CARD_LINK} w-full max-w-md px-5 sm:w-auto`}>
            <CryptoWalletIcon />
            <span className="min-w-0 text-balance">{t("wallets.seeAll")}</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
