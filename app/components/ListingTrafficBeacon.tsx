"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { reportListingPageview } from "@/lib/listingTrafficClient";

/** Records one anonymous UTM landing. Renders nothing and never throws. */
export default function ListingTrafficBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    reportListingPageview();
  }, [pathname]);

  return null;
}
