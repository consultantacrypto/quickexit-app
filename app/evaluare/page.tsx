import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";
import EvaluareClient from "./EvaluareClient";

export const metadata: Metadata = buildPageMetadata({
  title: "Evaluare rapidă active | Quick Exit",
  description:
    "Evaluează rapid un activ și află dacă se potrivește pentru o vânzare rapidă prin Quick Exit.",
  path: "/evaluare",
});

export default function EvaluationPage() {
  return <EvaluareClient />;
}
