import { getTranslations } from "next-intl/server";
import { supabase } from "@/lib/supabase";
import { formatRoundedEurAmount } from "@/lib/i18n/format";

function countDistinctActiveCategories(
  rows: { category?: string | null }[] | null | undefined,
): number {
  const seen = new Set<string>();
  for (const row of rows ?? []) {
    const cat = typeof row.category === "string" ? row.category.trim() : "";
    if (cat) seen.add(cat);
  }
  return seen.size;
}

async function fetchPlatformStats() {
  const [listingsRes, demandsRes, soldRes, categoriesRes] = await Promise.all([
    supabase
      .from("listings")
      .select("exit_price, market_price")
      .eq("status", "active")
      .eq("is_seed", false),
    supabase.from("demands").select("budget").eq("status", "active"),
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("status", "sold"),
    supabase
      .from("listings")
      .select("category")
      .eq("status", "active")
      .eq("is_seed", false),
  ]);

  if (listingsRes.error) {
    console.error("[GlobalStats] listings:", listingsRes.error.message);
  }
  if (demandsRes.error) {
    console.error("[GlobalStats] demands:", demandsRes.error.message);
  }
  if (soldRes.error) {
    console.error("[GlobalStats] sold count:", soldRes.error.message);
  }
  if (categoriesRes.error) {
    console.error("[GlobalStats] categories:", categoriesRes.error.message);
  }

  const listings = listingsRes.data ?? [];
  const demands = demandsRes.data ?? [];

  const valoareVanzari = listings.reduce(
    (acc, row) => acc + (Number(row.exit_price) || Number(row.market_price) || 0),
    0,
  );
  const valoareCumparari = demands.reduce(
    (acc, row) => acc + (Number(row.budget) || 0),
    0,
  );

  return {
    activeListings: listings.length,
    activeDemands: demands.length,
    totalValue: valoareVanzari + valoareCumparari,
    soldItems: soldRes.count ?? 0,
    activeCategories: countDistinctActiveCategories(categoriesRes.data),
  };
}

type GlobalStatsProps = {
  locale: string;
};

export default async function GlobalStats({ locale }: GlobalStatsProps) {
  const t = await getTranslations("Home.globalStats");
  const stats = await fetchPlatformStats();
  const showSoldKpi = stats.soldItems > 0;

  return (
    <section className="relative z-20 border-t-8 border-black bg-black py-10 font-sans md:py-12">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex flex-col items-center justify-between gap-8 divide-y-2 divide-gray-800 md:flex-row md:gap-0 md:divide-x-2 md:divide-y-0">
          <div className="w-full flex-1 pt-4 text-center md:px-6 md:pt-0">
            <p className="mb-1 text-[10px] font-black uppercase italic tracking-[0.2em] text-gray-500 md:mb-2 md:text-xs">
              {t("declaredValueLabel")}
            </p>
            <p className="text-4xl font-black italic tracking-tighter text-[#FFD100] md:text-5xl">
              {stats.totalValue > 0 ? formatRoundedEurAmount(stats.totalValue, locale) : "—"}
            </p>
            {stats.totalValue > 0 ? (
              <p className="mt-2 text-[9px] font-bold uppercase tracking-widest text-gray-600">
                {t("declaredValueSub")}
              </p>
            ) : (
              <p className="mx-auto mt-2 max-w-[14rem] text-[8px] font-semibold normal-case leading-snug text-gray-500 md:max-w-xs md:text-[9px]">
                {t("declaredValueEmpty")}
              </p>
            )}
          </div>

          <div className="w-full flex-1 pt-6 text-center md:px-6 md:pt-0">
            <p className="mb-1 text-[10px] font-black uppercase italic tracking-[0.2em] text-gray-500 md:mb-2 md:text-xs">
              {t("activeDemandsLabel")}
            </p>
            <p className="text-3xl font-black italic tracking-tighter text-white md:text-4xl">
              {stats.activeDemands}
            </p>
            <p className="mt-2 text-[9px] font-bold uppercase tracking-widest text-gray-600">
              {t("activeDemandsSub")}
            </p>
          </div>

          <div className="w-full flex-1 pt-6 text-center md:px-6 md:pt-0">
            <p className="mb-1 text-[10px] font-black uppercase italic tracking-[0.2em] text-gray-500 md:mb-2 md:text-xs">
              {t("activeListingsLabel")}
            </p>
            <p className="text-3xl font-black italic tracking-tighter text-white md:text-4xl">
              {stats.activeListings}
            </p>
            <p className="mt-2 text-[9px] font-bold uppercase tracking-widest text-gray-600">
              {t("activeListingsSub")}
            </p>
          </div>

          <div className="w-full flex-1 pb-4 pt-6 text-center md:px-6 md:pb-0 md:pt-0">
            <p className="mb-1 text-[10px] font-black uppercase italic tracking-[0.2em] text-gray-500 md:mb-2 md:text-xs">
              {showSoldKpi ? t("soldLabel") : t("activeCategoriesLabel")}
            </p>
            <p className="text-3xl font-black italic tracking-tighter text-white md:text-4xl">
              {showSoldKpi ? stats.soldItems : stats.activeCategories}
            </p>
            <p className="mt-2 text-[9px] font-bold uppercase tracking-widest text-gray-600">
              {showSoldKpi ? t("soldSub") : t("activeCategoriesSub")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
