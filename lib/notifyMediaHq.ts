/**
 * Best-effort internal HQ alert when a Media order becomes paid + queued.
 * Never throws into the Stripe webhook fulfillment path.
 * Reuses Resend (RESEND_API_KEY + RESEND_FROM). Recipients: MEDIA_HQ_ALERT_EMAILS.
 */

import {
  resolveTransactionalFromAddress,
  sanitizeEmailHeaderValue,
} from "@/lib/notifySeller";
import { packageLabel } from "@/lib/mediaHqOps";
import type { MediaPackageId } from "@/lib/mediaPricing";
import { isMediaPackageId } from "@/lib/mediaPricing";

export type MediaHqNotifyDeps = {
  fetchImpl?: typeof fetch;
  env?: Record<string, string | undefined>;
};

export type MediaHqNotifyResult = {
  attempted: boolean;
  sent: boolean;
  skipped: boolean;
  reason:
    | "sent"
    | "missing_recipients"
    | "invalid_recipients"
    | "no_provider"
    | "send_failed"
    | "not_newly_paid"
    | "not_queued";
};

export type MediaHqAlertPayload = {
  mediaOrderId: string;
  listingId: string;
  listingTitle: string;
  package: string;
  amountRon: number;
  listingValueEur: number;
  valueTier: string;
  paidAt: string | null;
  locale: string | null;
  source: string | null;
  editorialStatus: string | null;
  hqUrl?: string;
  listingUrl?: string | null;
};

function readEnv(deps: MediaHqNotifyDeps | undefined, key: string): string {
  const bag = deps?.env ?? process.env;
  return String(bag[key] ?? "").trim();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Parse MEDIA_HQ_ALERT_EMAILS into unique lowercase emails. */
export function parseMediaHqAlertEmails(
  raw: string | undefined | null,
): string[] {
  if (!raw || !String(raw).trim()) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of String(raw).split(",")) {
    const email = part.trim().toLowerCase();
    if (!email) continue;
    if (!EMAIL_RE.test(email)) continue;
    if (seen.has(email)) continue;
    seen.add(email);
    out.push(email);
  }
  return out;
}

export function isMediaHqResendConfigured(deps?: MediaHqNotifyDeps): boolean {
  return Boolean(readEnv(deps, "RESEND_API_KEY") && resolveTransactionalFromAddress(deps));
}

export function resolveMediaHqUrl(deps?: MediaHqNotifyDeps): string {
  const site =
    readEnv(deps, "NEXT_PUBLIC_SITE_URL") ||
    readEnv(deps, "NEXT_PUBLIC_BASE_URL") ||
    "https://www.quickexit.ro";
  const base = site.replace(/\/$/, "");
  return `${base}/ro/hq-admin/media`;
}

export function resolvePublicListingUrl(
  listingId: string,
  locale: string | null | undefined,
  deps?: MediaHqNotifyDeps,
): string {
  const site =
    readEnv(deps, "NEXT_PUBLIC_SITE_URL") ||
    readEnv(deps, "NEXT_PUBLIC_BASE_URL") ||
    "https://www.quickexit.ro";
  const loc = locale === "en" ? "en" : "ro";
  return `${site.replace(/\/$/, "")}/${loc}/anunt/${listingId}`;
}

export function buildMediaHqAlertEmail(input: {
  from: string;
  recipients: string[];
  payload: MediaHqAlertPayload;
}): { from: string; to: string[]; subject: string; text: string } {
  const pkg = isMediaPackageId(input.payload.package)
    ? packageLabel(input.payload.package as MediaPackageId, "ro")
    : sanitizeEmailHeaderValue(String(input.payload.package));
  const title =
    sanitizeEmailHeaderValue(input.payload.listingTitle, 120) || "Anunț QuickExit";
  const subject = `[QuickExit Media] Comandă nouă plătită — ${pkg}`;
  const hq = input.payload.hqUrl || "https://www.quickexit.ro/ro/hq-admin/media";
  const lines = [
    "Comandă QuickExit Media plătită — a intrat în coada editorială.",
    "",
    `Listing: ${title}`,
    `Listing ID: ${input.payload.listingId}`,
    `Order ID: ${input.payload.mediaOrderId}`,
    `Pachet: ${pkg}`,
    `Sumă Media: ${input.payload.amountRon} RON`,
    `Valoare listing (snapshot): ${input.payload.listingValueEur} EUR`,
    `Tier: ${input.payload.valueTier}`,
    `Plătit la: ${input.payload.paidAt || "—"}`,
    `Locale: ${input.payload.locale || "—"}`,
    `Source: ${input.payload.source || "—"}`,
    `Editorial: ${input.payload.editorialStatus || "queued"}`,
  ];
  if (input.payload.listingUrl) {
    lines.push(`Anunț: ${input.payload.listingUrl}`);
  }
  lines.push("", `HQ Media: ${hq}`);
  return {
    from: input.from,
    to: input.recipients,
    subject,
    text: lines.join("\n"),
  };
}

/**
 * Send HQ alert. Call only after a proven pending→paid transition.
 * Never throws.
 */
export async function notifyMediaHqPaidQueued(
  input: {
    newlyPaid: boolean;
    editorialStatus: string | null | undefined;
    payload: MediaHqAlertPayload;
  },
  deps?: MediaHqNotifyDeps,
): Promise<MediaHqNotifyResult> {
  try {
    if (!input.newlyPaid) {
      return {
        attempted: false,
        sent: false,
        skipped: true,
        reason: "not_newly_paid",
      };
    }
    if (String(input.editorialStatus || "") !== "queued") {
      return {
        attempted: false,
        sent: false,
        skipped: true,
        reason: "not_queued",
      };
    }

    const recipients = parseMediaHqAlertEmails(readEnv(deps, "MEDIA_HQ_ALERT_EMAILS"));
    if (recipients.length === 0) {
      const raw = readEnv(deps, "MEDIA_HQ_ALERT_EMAILS");
      return {
        attempted: false,
        sent: false,
        skipped: true,
        reason: raw ? "invalid_recipients" : "missing_recipients",
      };
    }

    if (!isMediaHqResendConfigured(deps)) {
      return {
        attempted: false,
        sent: false,
        skipped: true,
        reason: "no_provider",
      };
    }

    const apiKey = readEnv(deps, "RESEND_API_KEY");
    const from = resolveTransactionalFromAddress(deps);
    if (!apiKey || !from) {
      return {
        attempted: false,
        sent: false,
        skipped: true,
        reason: "no_provider",
      };
    }

    const email = buildMediaHqAlertEmail({
      from,
      recipients,
      payload: {
        ...input.payload,
        hqUrl: input.payload.hqUrl || resolveMediaHqUrl(deps),
        listingUrl:
          input.payload.listingUrl ??
          resolvePublicListingUrl(
            input.payload.listingId,
            input.payload.locale,
            deps,
          ),
      },
    });

    const fetchImpl = deps?.fetchImpl ?? fetch;
    const response = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(email),
    });

    if (!response.ok) {
      console.warn("[notifyMediaHq] provider rejected send", {
        mediaOrderId: input.payload.mediaOrderId,
        listingId: input.payload.listingId,
        status: response.status,
      });
      return {
        attempted: true,
        sent: false,
        skipped: false,
        reason: "send_failed",
      };
    }

    console.log("[notifyMediaHq] sent", {
      mediaOrderId: input.payload.mediaOrderId,
      listingId: input.payload.listingId,
      recipientCount: recipients.length,
    });

    return {
      attempted: true,
      sent: true,
      skipped: false,
      reason: "sent",
    };
  } catch {
    console.warn("[notifyMediaHq] send threw", {
      mediaOrderId: input.payload.mediaOrderId,
      listingId: input.payload.listingId,
    });
    return {
      attempted: true,
      sent: false,
      skipped: false,
      reason: "send_failed",
    };
  }
}
