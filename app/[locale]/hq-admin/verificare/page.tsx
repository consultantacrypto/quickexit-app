import type { Metadata } from "next";
import VerifiedQeAdminClient from "./VerifiedQeAdminClient";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Manual Verificat QE screen. Authorization is the shared hq-admin layout
 * (HQ email allowlist, fail-closed). Writes go through /api/hq/verified-qe.
 */
export default function VerifiedQeAdminPage() {
  return <VerifiedQeAdminClient />;
}
