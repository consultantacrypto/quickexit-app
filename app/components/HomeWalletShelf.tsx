import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/src/i18n/navigation";
import { WALLET_BRANDS, type WalletBrandProfile } from "@/lib/walletBrands";
import { brandStartingPrice } from "@/lib/walletBrandSpecs";
import type { WalletBrandSlug, WalletLocale } from "@/lib/walletCatalog";

/** Homepage shelf order. Images and prices stay in the wallet catalog. */
const FEATURED_BRANDS = ["tangem", "ledger", "trezor", "safepal", "keystone"] as const satisfies readonly WalletBrandSlug[];

const CARD =
  "flex w-[82%] max-w-[17.5rem] min-w-0 shrink-0 snap-start flex-col overflow-hidden rounded-3xl border border-line/70 bg-surface text-ink shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-500 ease-out hover:-translate-y-1 hover:border-neutral-300/80 hover:shadow-[0_28px_50px_-16px_rgba(0,0,0,0.22)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 lg:w-auto lg:max-w-none";

const CARD_BUTTON =
  "mt-auto inline-flex min-h-9 w-full items-center justify-center rounded-xl border-2 border-black bg-[#FFD100] px-3 py-2 text-center text-[11px] font-black uppercase tracking-widest text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black";

const SEE_ALL =
  "group inline-flex items-center gap-1.5 border-b-2 border-transparent text-[11px] font-black uppercase tracking-widest text-neutral-600 underline-offset-4 transition hover:border-black hover:text-black md:text-xs";

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
      className="scroll-mt-20 border-t border-gray-100 bg-white py-10 md:scroll-mt-32 md:py-14"
    >
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        <div className="mb-5 flex flex-col items-start justify-between gap-4 md:mb-6 md:flex-row md:items-end">
          <div>
            <h2
              id="recommended-crypto-wallets-title"
              className="text-3xl font-black uppercase italic tracking-tight text-black md:text-4xl"
            >
              {title.before}
              <span className="text-[#FFD100]">{title.highlight}</span>
              {title.after}
            </h2>
            <p className="mt-3 max-w-4xl text-xs font-bold leading-snug text-neutral-600 md:text-sm md:leading-relaxed">
              {t("wallets.disclosure")}
            </p>
          </div>
        </div>

        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:none] lg:grid lg:snap-none lg:grid-cols-5 lg:gap-6 lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden">
          {brands.map((brand) => {
            const price = brandStartingPrice(brand.slug, locale);
            const alt = locale === "en" ? brand.image.altEn : brand.image.altRo;
            const blurb = brand.shortDescription?.[locale === "en" ? "en" : "ro"];
            return (
              <article key={brand.slug} className={CARD}>
                <div className="relative h-36 w-full overflow-hidden bg-canvas sm:h-32 lg:h-28">
                  <Image
                    src={brand.image.src}
                    alt={alt}
                    fill
                    loading="lazy"
                    fetchPriority="low"
                    sizes="(max-width: 1023px) 280px, 220px"
                    className={
                      brand.slug === "tangem"
                        ? "origin-center object-contain scale-[1.65] lg:scale-100 lg:p-1"
                        : "object-contain p-1.5"
                    }
                  />
                </div>
                <div className="flex flex-1 flex-col gap-2 p-3 md:p-4">
                  <h3 className="text-base font-semibold leading-snug tracking-tight text-ink">{brand.name}</h3>
                  {blurb ? <p className="text-[11px] font-medium leading-snug text-muted">{blurb}</p> : null}
                  {price ? (
                    <p className="text-lg font-bold leading-none tracking-tight text-ink">
                      {price.from ? (
                        <span className="mr-1 text-[11px] font-medium uppercase tracking-wider text-muted">
                          {tPrice("fromPrefix")}
                        </span>
                      ) : null}
                      {price.text}
                    </p>
                  ) : null}
                  <Link href={`/wallets#brand-${brand.slug}`} className={CARD_BUTTON}>
                    {t("wallets.cardCta", { brand: brand.name })}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-5 flex justify-end md:mt-6">
          <Link href="/wallets" className={SEE_ALL}>
            {t("wallets.seeAll")}
            <span className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden>
              →
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
