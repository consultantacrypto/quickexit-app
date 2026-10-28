import type { Metadata } from "next";
import Image from "next/image";
import { setRequestLocale } from "next-intl/server";
import { companyInfo } from "@/lib/company";
import { resolvePageLocale, type PageLocale } from "@/lib/seo";
import { getSiteUrl } from "@/lib/siteUrl";
import { Link } from "@/src/i18n/navigation";
import CopyAddressButton from "./CopyAddressButton";
import {
  BMK_BSCSCAN_TOKEN_URL,
  BMK_CONTRACT,
  BMK_OFFICIAL_PAGE_URL,
  BMK_PAGE_TITLE,
  BMK_PANCAKE_URL,
  BMK_POOL_ADDRESS,
  getBmkCopy,
  type BmkCopy,
  type BmkUse,
} from "./content";

type PageProps = {
  params: Promise<{ locale: string }>;
};

const externalLinkClass =
  "font-black text-black underline decoration-[#FFD100] decoration-4 underline-offset-4 hover:text-neutral-700";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const loc = resolvePageLocale(locale);
  const copy = getBmkCopy(loc);
  const siteUrl = getSiteUrl();
  const canonical = loc === "en" ? `${siteUrl}/en/bmk` : `${siteUrl}/bmk`;
  const image = `${siteUrl}/bmk/bmk-logo-512.png`;

  return {
    metadataBase: new URL(siteUrl),
    title: { absolute: BMK_PAGE_TITLE },
    description: copy.metaDescription,
    robots: { index: true, follow: true },
    alternates: {
      canonical,
      languages: {
        ro: `${siteUrl}/bmk`,
        en: `${siteUrl}/en/bmk`,
        "x-default": `${siteUrl}/bmk`,
      },
    },
    openGraph: {
      title: BMK_PAGE_TITLE,
      description: copy.metaDescription,
      url: canonical,
      type: "website",
      siteName: "Quick Exit",
      locale: loc === "en" ? "en_GB" : "ro_RO",
      images: [
        {
          url: image,
          width: 512,
          height: 512,
          alt: copy.logoAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: BMK_PAGE_TITLE,
      description: copy.metaDescription,
      images: [image],
    },
  };
}

function UseSiteLink({ item }: { item: BmkUse }) {
  if (item.external) {
    return (
      <a href={item.href} target="_blank" rel="noopener noreferrer" className={externalLinkClass}>
        {item.name}
      </a>
    );
  }

  return (
    <Link href={item.href} className={externalLinkClass}>
      {item.name}
    </Link>
  );
}

function AddressText({ text }: { text: string }) {
  if (!text.includes(BMK_CONTRACT)) return text;

  const parts = text.split(BMK_CONTRACT);
  return parts.map((part, index) => (
    <span key={`${index}-${part.slice(0, 12)}`}>
      {index > 0 ? (
        <code className="break-all font-mono text-[13px] font-bold text-black">{BMK_CONTRACT}</code>
      ) : null}
      {part}
    </span>
  ));
}

function BmkArticle({ copy, locale }: { copy: BmkCopy; locale: PageLocale }) {
  return (
    <div className="min-h-screen bg-[#F7F4EC] px-4 pb-28 pt-10 font-sans text-neutral-900 antialiased selection:bg-[#FFD100]/40 md:px-8 md:pt-16">
      <article className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="mb-8 inline-block border-b-2 border-black pb-1 text-xs font-black uppercase tracking-widest italic transition hover:border-[#FFD100] hover:text-[#FFD100]"
        >
          ← {copy.back}
        </Link>

        <div className="mb-8 flex justify-center">
          <Image
            src="/bmk/bmk-logo-256.png"
            alt={copy.logoAlt}
            width={256}
            height={256}
            priority
            className="h-[256px] w-[256px] max-w-full"
          />
        </div>

        <header className="mb-10 rounded-[2rem] border-[3px] border-black bg-black p-8 text-center text-white shadow-[10px_10px_0_0_#FFD100] md:p-12">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#FFD100]/90">{copy.kicker}</p>
          <h1 className="mt-4 text-3xl font-black uppercase italic leading-tight md:text-5xl">
            Bitmarket <span className="text-[#FFD100]">(BMK)</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm font-semibold text-neutral-200 md:text-base">{copy.subtitle}</p>
          <p className="mx-auto mt-4 max-w-lg text-[11px] font-medium uppercase tracking-wider text-neutral-400">
            {copy.heroNote}
          </p>
        </header>

        <div className="space-y-10 rounded-[2rem] border-[3px] border-black bg-white p-6 shadow-[12px_12px_0_0_rgba(0,0,0,0.1)] md:p-14 md:shadow-[14px_14px_0_0_#FFD100]">
          <section
            id="rebrand"
            aria-labelledby="bmk-rebrand"
            className="scroll-mt-20 space-y-4 rounded-2xl border-[3px] border-black bg-[#FFD100] p-5 text-black md:scroll-mt-36 md:p-6"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.28em]">{copy.rebrandKicker}</p>
            <h2 id="bmk-rebrand" className="text-xl font-black uppercase italic tracking-tight md:text-2xl">
              {copy.rebrandTitle}
            </h2>
            <p className="text-sm font-black leading-relaxed md:text-base">{copy.rebrandLead}</p>
            <p className="text-sm font-medium leading-relaxed md:text-base">{copy.rebrandBody}</p>
            <p className="text-sm font-medium leading-relaxed md:text-base">
              {copy.rebrandContractLead}{" "}
              <code className="break-all font-mono text-[13px] font-bold">{BMK_CONTRACT}</code>
            </p>
            <p className="text-sm font-bold leading-relaxed md:text-base">
              {copy.rebrandPageLabel}{" "}
              <a
                href={BMK_OFFICIAL_PAGE_URL}
                className="break-all font-black underline decoration-black decoration-2 underline-offset-4"
              >
                {BMK_OFFICIAL_PAGE_URL}
              </a>
            </p>
          </section>

          <section className="space-y-4 border-t border-black/10 pt-8">
            <h2 className="text-xl font-black uppercase italic tracking-tight text-black md:text-2xl">{copy.whatTitle}</h2>
            {copy.what.map((paragraph) => (
              <p key={paragraph} className="text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
                {paragraph}
              </p>
            ))}
          </section>

          <section className="space-y-5 border-t border-black/10 pt-8" aria-labelledby="bmk-official">
            <h2 id="bmk-official" className="text-xl font-black uppercase italic tracking-tight text-black md:text-2xl">
              {copy.officialTitle}
            </h2>

            <dl className="grid gap-4 sm:grid-cols-2">
              {copy.details.map((row) => (
                <div key={row.label} className="rounded-2xl border-2 border-black/10 bg-[#F7F4EC] px-4 py-3">
                  <dt className="text-[10px] font-black uppercase tracking-widest text-neutral-500">{row.label}</dt>
                  <dd className="mt-1 text-sm font-bold text-black">{row.value}</dd>
                </div>
              ))}
            </dl>

            <div className="rounded-2xl border-[3px] border-black bg-[#F7F4EC] p-5 md:p-6">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-neutral-500">{copy.contractLabel}</h3>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <code className="break-all font-mono text-sm font-bold text-black md:text-base">{BMK_CONTRACT}</code>
                <CopyAddressButton value={BMK_CONTRACT} label={copy.copyLabel} copiedLabel={copy.copiedLabel} />
              </div>
              <a
                href={BMK_BSCSCAN_TOKEN_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 block break-all font-mono text-xs font-bold text-black underline decoration-[#FFD100] decoration-4 underline-offset-4 hover:text-neutral-700 md:text-sm"
              >
                {copy.bscscanLabel}: {BMK_BSCSCAN_TOKEN_URL}
              </a>
            </div>

            <div className="rounded-2xl border-2 border-black/15 px-4 py-4">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-neutral-500">{copy.pancakeLabel}</h3>
              <p className="mt-2 text-sm font-medium text-neutral-700">
                {copy.pancakePair}{" "}
                <code className="break-all font-mono text-[13px] font-bold text-black">{BMK_POOL_ADDRESS}</code>
              </p>
              <a
                href={BMK_PANCAKE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 block break-all font-mono text-xs font-bold text-black underline decoration-[#FFD100] decoration-4 underline-offset-4 hover:text-neutral-700 md:text-sm"
              >
                {BMK_PANCAKE_URL}
              </a>
            </div>

            <p className="text-sm font-bold leading-relaxed text-neutral-800">{copy.unofficialWarning}</p>
          </section>

          <section className="space-y-4 border-t border-black/10 pt-8">
            <h2 className="text-xl font-black uppercase italic tracking-tight text-black md:text-2xl">{copy.useTitle}</h2>
            <ul className="space-y-3">
              {copy.uses.map((item) => (
                <li key={item.name} className="text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
                  <UseSiteLink item={item} />
                  {": "}
                  {item.text}
                </li>
              ))}
            </ul>
            <p className="text-sm font-medium leading-relaxed text-neutral-700 md:text-base">{copy.useNote}</p>
          </section>

          <section className="space-y-4 border-t border-black/10 pt-8">
            <h2 className="text-xl font-black uppercase italic tracking-tight text-black md:text-2xl">{copy.walletTitle}</h2>
            <ol className="space-y-4">
              {copy.walletSteps.map((step, index) => (
                <li key={step} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-black bg-[#FFD100] text-sm font-black">
                    {index + 1}
                  </span>
                  <p className="pt-1 text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
                    <AddressText text={step} />
                  </p>
                </li>
              ))}
            </ol>
            <p className="text-sm font-medium leading-relaxed text-neutral-600">{copy.walletNote}</p>
          </section>

          <section className="space-y-4 rounded-2xl border-[3px] border-black bg-[#FFD100] p-5 text-black md:p-6">
            <h2 className="text-xl font-black uppercase italic tracking-tight md:text-2xl">{copy.securityTitle}</h2>
            <p className="text-sm font-black leading-relaxed md:text-base">{copy.securityLead}</p>
            <ul className="list-disc space-y-3 pl-5 text-sm font-medium leading-relaxed md:text-base">
              {copy.securityItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
              <li>
                {copy.securityContactLead}{" "}
                <a href={`mailto:${companyInfo.publicEmail}`} className="font-black underline decoration-black decoration-2 underline-offset-4">
                  {companyInfo.publicEmail}
                </a>
                .
              </li>
            </ul>
          </section>

          <section className="space-y-4 border-t border-black/10 pt-8">
            <h2 className="text-xl font-black uppercase italic tracking-tight text-black md:text-2xl">
              {copy.transparencyTitle}
            </h2>
            <p className="text-sm font-medium leading-relaxed text-neutral-700 md:text-base">{copy.transparencyIntro}</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse text-left">
                <thead>
                  <tr className="border-b-2 border-black text-[10px] font-black uppercase tracking-widest text-neutral-500">
                    <th scope="col" className="py-3 pr-4">
                      {copy.tableRole}
                    </th>
                    <th scope="col" className="py-3 pr-4">
                      {copy.tableAddress}
                    </th>
                    <th scope="col" className="py-3">
                      {copy.tableNote}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {copy.wallets.map((row) => (
                    <tr key={row.address} className="border-b border-black/10 align-top">
                      <th scope="row" className="py-4 pr-4 text-sm font-bold text-black">
                        {row.role}
                      </th>
                      <td className="py-4 pr-4">
                        <a
                          href={`https://bscscan.com/address/${row.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="break-all font-mono text-xs font-bold text-black underline decoration-[#FFD100] decoration-2 underline-offset-4"
                        >
                          {row.address}
                        </a>
                      </td>
                      <td className="py-4 text-sm font-medium leading-relaxed text-neutral-700">{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm font-medium leading-relaxed text-neutral-700">{copy.snapshot}</p>
            <p className="text-sm font-medium leading-relaxed text-neutral-700">
              {copy.mintingBefore}{" "}
              <code className="font-mono text-[13px] font-bold text-black">finishMinting()</code>
              {locale === "en" ? " " : ""}
              {copy.mintingAfter}
            </p>
          </section>

          <section className="space-y-3 border-t border-black/10 pt-8" id="contact">
            <h2 className="text-xl font-black uppercase italic tracking-tight text-black md:text-2xl">{copy.contactTitle}</h2>
            <p className="text-sm font-bold text-neutral-800 md:text-base">{copy.contactLead}</p>
            <a
              href={`mailto:${companyInfo.publicEmail}`}
              className="inline-block text-2xl font-black italic tracking-tight text-black underline decoration-[#FFD100] decoration-4 underline-offset-4 hover:text-neutral-700"
            >
              {companyInfo.publicEmail}
            </a>
          </section>

          <p className="border-t border-black/10 pt-8 text-xs font-medium italic leading-relaxed text-neutral-500">
            {copy.disclaimer}
          </p>
        </div>
      </article>
    </div>
  );
}

export default async function BmkPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const loc = resolvePageLocale(locale);
  return <BmkArticle copy={getBmkCopy(loc)} locale={loc} />;
}
