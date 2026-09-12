"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackConsentedPageView } from "@/lib/analytics";
import { useConsent } from "./ConsentProvider";

export default function ConsentedPageViewTracker() {
  const pathname = usePathname();
  const { preferences } = useConsent();

  useEffect(() => {
    if (preferences?.analytics !== true) {
      trackConsentedPageView();
      return;
    }
    trackConsentedPageView(pathname);
  }, [preferences?.analytics, pathname]);

  return null;
}
