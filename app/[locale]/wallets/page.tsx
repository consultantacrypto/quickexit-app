import type { Metadata } from "next";
import { connection } from "next/server";
import { PAGE_METADATA_COPY } from "@/lib/pageMetadataCopy";
import { buildPageMetadata, resolvePageLocale } from "@/lib/seo";
import { isTangemBlackFridayVisible } from "@/lib/tangemBlackFriday";
import TangemBlackFridayBanner from "./TangemBlackFridayBanner";
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

/** Per-request cutoff. A static or ISR render would leave the promo in cached HTML after it ends. */
export const dynamic = "force-dynamic";

export default async function WalletsPage() {
  await connection();
  const tangemPromoVisible = isTangemBlackFridayVisible(new Date());

  return (
    <>
      <WalletTrafficBeacon />
      <WalletCatalog promo={<TangemBlackFridayBanner serverVisible={tangemPromoVisible} />} />
    </>
  );
}
