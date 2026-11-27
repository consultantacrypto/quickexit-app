import type { Metadata } from "next";
import { connection } from "next/server";
import { PAGE_METADATA_COPY } from "@/lib/pageMetadataCopy";
import { buildPageMetadata, resolvePageLocale } from "@/lib/seo";
import { activeWalletPromoIds } from "@/lib/walletPromos";
import WalletCatalog from "./WalletCatalog";
import WalletTrafficBeacon from "./WalletTrafficBeacon";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const loc = resolvePageLocale(locale);
  const copy = PAGE_METADATA_COPY.wallets[loc];

  return buildPageMetadata({
    locale: loc,
    title: copy.title,
    description: copy.description,
    path: "/wallets",
  });
}

/** Request-time cutoff. A static render would leave an expired promo in the HTML. */
export const dynamic = "force-dynamic";

export default async function WalletsPage() {
  await connection();
  const activePromoIds = activeWalletPromoIds(new Date());

  return (
    <>
      <WalletTrafficBeacon />
      <WalletCatalog activePromoIds={activePromoIds} />
    </>
  );
}
