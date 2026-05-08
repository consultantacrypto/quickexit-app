"use client";

import { useEffect } from "react";
import { captureAttribution } from "@/lib/analytics";

export default function AnalyticsAttributionInit() {
  useEffect(() => {
    captureAttribution();
  }, []);

  return null;
}
