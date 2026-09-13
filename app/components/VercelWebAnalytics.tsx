"use client";

import { Analytics } from "@vercel/analytics/next";
import { sanitizeVercelAnalyticsEvent } from "@/lib/vercelWebAnalytics";

export default function VercelWebAnalytics() {
  return <Analytics beforeSend={sanitizeVercelAnalyticsEvent} />;
}
