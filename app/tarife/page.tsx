import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";
import TarifeClient from "./TarifeClient";

export const metadata: Metadata = buildPageMetadata({
  title: "Tarife Quick Exit | Pachete pentru vânzare rapidă",
  description:
    "Alege pachetul potrivit pentru publicarea și expunerea activului tău pe Quick Exit.",
  path: "/tarife",
});

export default function PricingPage() {
  return <TarifeClient />;
}