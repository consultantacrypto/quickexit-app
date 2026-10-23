"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { captureLandingAttribution } from "@/lib/attribution";

export default function AttributionCapture() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    captureLandingAttribution();
  }, [pathname, searchParams]);

  return null;
}
