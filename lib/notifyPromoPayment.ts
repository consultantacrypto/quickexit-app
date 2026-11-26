/**
 * Best-effort alert when a listing Checkout payment is recorded.
 * Email reuses Resend (RESEND_API_KEY + RESEND_FROM). Recipient: PROMO_NOTIFY_EMAIL.
 * A promo_queue row is the durable tracker (pending / done / late, due paid_at + 1h).
 * Never throws into the Stripe webhook.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { logInfo, logWarn } from "@/lib/observability";
import { resolvePublicListingUrl } from "@/lib/notifyMediaHq";
import {
  resolveTransactionalFromAddress,
  sanitizeEmailHeaderValue,
  type NotifySellerDeps,
} from "@/lib/notifySeller";
import { getPackageByPackageId } from "@/lib/stripePackages";
import { isPaymentLedgerDuplicate } from "@/lib/stripePaymentLedger";

export const PROMO_DEADLINE_MS = 60 * 60 * 1000;
export const PROMO_NOTIFY_EMAIL_ENV = "PROMO_NOTIFY_EMAIL";
export const PROMO_TIME_ZONE = "Europe/Bucharest";

/** Inclusive Bucharest wall-clock window for a one-hour deadline. 21:00:00 is in; 21:00:01 is not. */
export const PROMO_DAY_START_MS = 8 * 60 * 60 * 1000;
export const PROMO_DAY_END_MS = 21 * 60 * 60 * 1000;
export const PROMO_MORNING_DUE_HOUR = 9;

export type PromoQueueStatus = "pending" | "done" | "late";

export type PromoQueueRow = {
  stripe_checkout_session_id: string;
  stripe_payment_intent_id: string | null;
  listing_id: string;
  title: string;
  package_id: string | null;
  amount_minor: number;
  currency: string;
  paid_at: string;
  due_at: string;
  status: PromoQueueStatus;
  public_url: string;
};

export type PromoNotifyResult = {
  queue: "inserted" | "duplicate" | "failed";
  email: "sent" | "skipped" | "failed";
  emailReason:
    | "sent"
    | "duplicate"
    | "missing_recipient"
    | "invalid_recipient"
    | "no_provider"
    | "send_failed"
    | "queue_failed"
    | null;
};

function readEnv(deps: NotifySellerDeps | undefined, key: string): string {
  const bag = deps?.env ?? process.env;
  return String(bag[key] ?? "").trim();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parsePromoNotifyEmail(raw: string | undefined | null): string | null {
  const email = String(raw ?? "").trim().toLowerCase();
  if (!email || email.includes(",")) return null;
  return EMAIL_RE.test(email) ? email : null;
}

type BucharestParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function partNumber(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): number {
  const raw = parts.find((part) => part.type === type)?.value ?? "";
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}

/** Wall-clock fields in Europe/Bucharest, including the DST offset in force at `date`. */
export function bucharestParts(date: Date): BucharestParts {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: PROMO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  let hour = partNumber(parts, "hour");
  if (hour === 24) hour = 0;
  return {
    year: partNumber(parts, "year"),
    month: partNumber(parts, "month"),
    day: partNumber(parts, "day"),
    hour,
    minute: partNumber(parts, "minute"),
    second: partNumber(parts, "second"),
  };
}

function bucharestOffsetMs(date: Date): number {
  const parts = bucharestParts(date);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    date.getUTCMilliseconds(),
  );
  return asUtc - date.getTime();
}

/** 09:00 Europe/Bucharest on a civil date. The instant follows the offset of that morning, including DST. */
export function bucharestMorningDue(year: number, month: number, day: number): Date {
  const wallAsUtc = Date.UTC(year, month - 1, day, PROMO_MORNING_DUE_HOUR, 0, 0, 0);
  const first = new Date(wallAsUtc - bucharestOffsetMs(new Date(wallAsUtc)));
  return new Date(wallAsUtc - bucharestOffsetMs(first));
}

function addCivilDays(year: number, month: number, day: number, days: number): {
  year: number;
  month: number;
  day: number;
} {
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

/**
 * Daytime payments (08:00:00 through 21:00:00 inclusive, Europe/Bucharest) are due one real hour later.
 * Before 08:00, due at 09:00 the same Bucharest morning.
 * After 21:00, including 21:30, due at 09:00 the next Bucharest morning.
 */
export function promoDueAt(paidAt: Date): Date {
  const paid = Number.isNaN(paidAt.getTime()) ? new Date() : paidAt;
  const parts = bucharestParts(paid);
  const msOfDay =
    ((parts.hour * 60 + parts.minute) * 60 + parts.second) * 1000 + paid.getUTCMilliseconds();
  if (msOfDay >= PROMO_DAY_START_MS && msOfDay <= PROMO_DAY_END_MS) {
    return new Date(paid.getTime() + PROMO_DEADLINE_MS);
  }
  const morning =
    msOfDay < PROMO_DAY_START_MS
      ? { year: parts.year, month: parts.month, day: parts.day }
      : addCivilDays(parts.year, parts.month, parts.day, 1);
  return bucharestMorningDue(morning.year, morning.month, morning.day);
}

export function promoDueAtIso(paidAtIso: string): string {
  const paid = new Date(paidAtIso);
  return promoDueAt(paid).toISOString();
}

export function classifyPromoQueueStatus(dueAtIso: string, now = new Date()): PromoQueueStatus {
  const due = new Date(dueAtIso);
  if (Number.isNaN(due.getTime())) return "pending";
  return now.getTime() > due.getTime() ? "late" : "pending";
}

export function formatEuropeBucharest(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("ro-RO", {
    timeZone: "Europe/Bucharest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

export function packageLabelForPromo(packageId: string | null | undefined): string {
  const id = String(packageId ?? "").trim();
  if (!id) return "—";
  const pkg = getPackageByPackageId(id);
  return pkg ? `${id} (${pkg.label})` : id;
}

export function formatMinorAmount(amountMinor: number, currency: string): string {
  const major = (amountMinor / 100).toFixed(2);
  return `${major} ${currency.toUpperCase()}`;
}

export function buildPromoQueueRow(input: {
  sessionId: string;
  paymentIntentId: string | null;
  listingId: string;
  title: string;
  packageId: string | null;
  amountMinor: number;
  currency: string;
  paidAtIso: string;
  locale: string | null;
  now?: Date;
  deps?: NotifySellerDeps;
}): PromoQueueRow {
  const dueAt = promoDueAtIso(input.paidAtIso);
  const title = sanitizeEmailHeaderValue(input.title, 180) || "Anunț QuickExit";
  return {
    stripe_checkout_session_id: input.sessionId,
    stripe_payment_intent_id: input.paymentIntentId,
    listing_id: input.listingId,
    title,
    package_id: input.packageId,
    amount_minor: input.amountMinor,
    currency: input.currency.toLowerCase(),
    paid_at: input.paidAtIso,
    due_at: dueAt,
    status: classifyPromoQueueStatus(dueAt, input.now ?? new Date()),
    public_url: resolvePublicListingUrl(input.listingId, input.locale, input.deps),
  };
}

export function buildPromoNotifyEmail(input: {
  from: string;
  to: string;
  row: PromoQueueRow;
}): { from: string; to: string[]; subject: string; text: string } {
  const subject = "[QuickExit] Anunț plătit — termen de promovare";
  const text = [
    "Plată confirmată pentru un anunț. Clip pe YouTube, TikTok, Instagram + post pe X (@QuickExitRo).",
    "Termenul de mai jos e ora Bucureștiului: +1 oră dacă plata e între 08:00 și 21:00 inclusiv; înainte de 08:00 sau după 21:00, la 09:00.",
    "",
    `ID anunț: ${input.row.listing_id}`,
    `Titlu: ${input.row.title}`,
    `Pachet: ${packageLabelForPromo(input.row.package_id)}`,
    `Sumă: ${formatMinorAmount(input.row.amount_minor, input.row.currency)}`,
    `Ora (Europe/Bucharest): ${formatEuropeBucharest(input.row.paid_at)}`,
    `Link: ${input.row.public_url}`,
    `Termen (Europe/Bucharest): ${formatEuropeBucharest(input.row.due_at)}`,
    `Coadă: ${input.row.status}`,
  ].join("\n");
  return {
    from: input.from,
    to: [input.to],
    subject,
    text,
  };
}

type QueueInsertResult = "inserted" | "duplicate" | "failed";

async function insertPromoQueue(
  admin: Pick<SupabaseClient, "from">,
  row: PromoQueueRow,
): Promise<QueueInsertResult> {
  const { error } = await admin.from("promo_queue").insert(row).select("id").maybeSingle();
  if (!error) return "inserted";
  if (isPaymentLedgerDuplicate(error)) return "duplicate";
  const message = String(error.message ?? "promo_queue insert failed").slice(0, 200);
  logWarn({
    component: "stripe_webhook",
    operation: "promo_queue",
    result: "warn",
    error_code: "promo_queue_failed",
    entity_id: row.listing_id,
    sessionId: row.stripe_checkout_session_id,
    supabase_code: error.code ?? null,
    message,
  });
  return "failed";
}

/**
 * Queue first, then email. Duplicate session does not send again.
 * A failed queue insert still attempts email when this payment row was new,
 * so a missing promo_queue table does not hide a fresh payment.
 */
export async function notifyListingPromoPayment(
  input: {
    admin: Pick<SupabaseClient, "from">;
    paymentInserted: boolean;
    sessionId: string;
    paymentIntentId: string | null;
    listingId: string;
    title: string;
    packageId: string | null;
    amountMinor: number;
    currency: string;
    paidAtIso: string;
    locale: string | null;
    eventId?: string | null;
  },
  deps?: NotifySellerDeps,
): Promise<PromoNotifyResult> {
  let queue: QueueInsertResult = "failed";
  let row: PromoQueueRow;
  try {
    row = buildPromoQueueRow({
      sessionId: input.sessionId,
      paymentIntentId: input.paymentIntentId,
      listingId: input.listingId,
      title: input.title,
      packageId: input.packageId,
      amountMinor: input.amountMinor,
      currency: input.currency,
      paidAtIso: input.paidAtIso,
      locale: input.locale,
      deps,
    });
    queue = await insertPromoQueue(input.admin, row);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logWarn({
      component: "stripe_webhook",
      operation: "promo_notify",
      result: "warn",
      error_code: "promo_queue_threw",
      entity_id: input.listingId,
      sessionId: input.sessionId,
      eventId: input.eventId ?? null,
      message: message.slice(0, 200),
    });
    return { queue: "failed", email: "failed", emailReason: "queue_failed" };
  }

  try {
    const shouldEmail = queue === "inserted" || (queue === "failed" && input.paymentInserted);
    if (!shouldEmail) {
      logInfo({
        component: "stripe_webhook",
        operation: "promo_notify",
        result: "skip",
        error_code: "promo_notify_duplicate",
        entity_id: input.listingId,
        sessionId: input.sessionId,
        eventId: input.eventId ?? null,
        queue,
      });
      return { queue, email: "skipped", emailReason: "duplicate" };
    }

    const recipient = parsePromoNotifyEmail(readEnv(deps, PROMO_NOTIFY_EMAIL_ENV));
    const rawRecipient = readEnv(deps, PROMO_NOTIFY_EMAIL_ENV);
    if (!recipient) {
      const reason = rawRecipient ? "invalid_recipient" : "missing_recipient";
      logWarn({
        component: "stripe_webhook",
        operation: "promo_notify",
        result: "warn",
        error_code: reason,
        entity_id: input.listingId,
        sessionId: input.sessionId,
        eventId: input.eventId ?? null,
        queue,
      });
      return { queue, email: "skipped", emailReason: reason };
    }

    const apiKey = readEnv(deps, "RESEND_API_KEY");
    const from = resolveTransactionalFromAddress(deps);
    if (!apiKey || !from) {
      logWarn({
        component: "stripe_webhook",
        operation: "promo_notify",
        result: "warn",
        error_code: "no_provider",
        entity_id: input.listingId,
        sessionId: input.sessionId,
        eventId: input.eventId ?? null,
        queue,
      });
      return { queue, email: "skipped", emailReason: "no_provider" };
    }

    const email = buildPromoNotifyEmail({ from, to: recipient, row });
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
      logWarn({
        component: "stripe_webhook",
        operation: "promo_notify",
        result: "warn",
        error_code: "send_failed",
        entity_id: input.listingId,
        sessionId: input.sessionId,
        eventId: input.eventId ?? null,
        httpStatus: response.status,
        queue,
      });
      return { queue, email: "failed", emailReason: "send_failed" };
    }

    logInfo({
      component: "stripe_webhook",
      operation: "promo_notify",
      result: "ok",
      entity_id: input.listingId,
      sessionId: input.sessionId,
      eventId: input.eventId ?? null,
      queue,
    });
    return { queue, email: "sent", emailReason: "sent" };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logWarn({
      component: "stripe_webhook",
      operation: "promo_notify",
      result: "warn",
      error_code: "promo_notify_threw",
      entity_id: input.listingId,
      sessionId: input.sessionId,
      eventId: input.eventId ?? null,
      message: message.slice(0, 200),
      queue,
    });
    return { queue, email: "failed", emailReason: "send_failed" };
  }
}
