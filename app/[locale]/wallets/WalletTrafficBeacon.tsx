"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { reportWalletPageview } from "@/lib/walletAffiliateTrafficClient";

/** Records one anonymous catalog view. Renders nothing and never throws. */
export default function WalletTrafficBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    reportWalletPageview();
  }, [pathname]);

  return null;
}
