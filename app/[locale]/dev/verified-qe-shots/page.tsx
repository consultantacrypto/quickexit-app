import type { Metadata } from "next";
import { notFound } from "next/navigation";
import VerifiedQeShots from "./Shots";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Verificat QE shots",
};

/**
 * Local screenshot fixture. Renders only when VERIFIED_QE_SCREENSHOTS=1.
 * It uses mock listings and does not read or write a database.
 */
export default function VerifiedQeShotsPage() {
  if (process.env.VERIFIED_QE_SCREENSHOTS !== "1") notFound();
  return <VerifiedQeShots />;
}
