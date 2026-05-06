import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";
import CategorieClient from "./CategorieClient";

type CategoryMeta = { label: string };

const categoryMetaMap: Record<string, CategoryMeta> = {
  auto: { label: "Auto & Moto" },
  imobiliare: { label: "Imobiliare" },
  lux: { label: "Lux & Ceasuri" },
  gadgets: { label: "Gadgets" },
  foto: { label: "Foto & Audio" },
  business: { label: "Afaceri de vânzare" },
};

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const category = categoryMetaMap[params.slug];
  const categoryLabel = category?.label ?? "Categorie";
  const slug = category ? params.slug : "auto";

  return buildPageMetadata({
    title: `Active din ${categoryLabel} pentru vânzare rapidă | Quick Exit`,
    description: `Explorează active din categoria ${categoryLabel}, listate pentru lichiditate rapidă și oportunități reale.`,
    path: `/categorii/${slug}`,
  });
}

export default function CategoryPage() {
  return <CategorieClient />;
}