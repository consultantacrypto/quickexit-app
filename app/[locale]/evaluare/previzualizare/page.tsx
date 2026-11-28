import type { Metadata } from "next";
import { notFound } from "next/navigation";
import EvaluareClient from "../EvaluareClient";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Previzualizare evaluare auto",
};

type PageProps = {
  searchParams: Promise<{ stare?: string }>;
};

/**
 * Development-only fixture for screenshots. Production and Vercel Preview 404.
 * It does not call /api/evaluate/qe and does not write to the database.
 */
export default async function QeValuationPreviewPage({ searchParams }: PageProps) {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }
  const { stare } = await searchParams;
  return <EvaluareClient devFixture={stare === "insuficient" ? "insufficient" : "result"} />;
}
