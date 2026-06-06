import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";
import PosteazaCerereClient from "./PosteazaCerereClient";

export const metadata: Metadata = buildPageMetadata({
  title: "Publică cerere de cumpărare | Quick Exit",
  description:
    "Spune ce vrei să cumperi, setează bugetul și atrage vânzători compatibili.",
  path: "/posteaza-cerere",
});

export default function PostDemandPage() {
  return <PosteazaCerereClient />;
}
