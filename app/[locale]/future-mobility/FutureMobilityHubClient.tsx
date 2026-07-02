"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

export default function FutureMobilityHubClient() {
  useEffect(() => {
    trackEvent("view_future_mobility", {
      page_path: "/future-mobility",
    });
  }, []);

  return null;
}
