/**
 * Resend-only seller notification boundary.
 * Never logs phone, email, message bodies, or provider credentials.
 * Does not send unless QUICKEXIT_ENABLE_SELLER_EMAIL=1 and Resend is configured.
 * SMTP is not implemented and is not treated as a provider.
 * Recipient must come from Auth admin lookup, never from the client body.
 */

export type SellerNotifyReason =
  | "no_provider"
  | "disabled"
  | "missing_recipient"
  | "send_failed"
  | "sent";

export type SellerNotifyResult =
  | { ok: true; reason: "sent"; channel: "resend" }
  | { ok: false; reason: Exclude<SellerNotifyReason, "sent"> };

export type NotifySellerDeps = {
  fetchImpl?: typeof fetch;
  env?: Record<string, string | undefined>;
};

export type InquiryEmailPayload = {
  from: string;
  to: string[];
  subject: string;
  text: string;
};

function readEnv(deps: NotifySellerDeps | undefined, key: string): string {
  const bag = deps?.env ?? process.env;
  return String(bag[key] ?? "").trim();
}

export function isSellerEmailConfigured(deps?: NotifySellerDeps): boolean {
  return Boolean(readEnv(deps, "RESEND_API_KEY") && resolveTransactionalFromAddress(deps));
}

export function hasEmailProviderConfig(deps?: NotifySellerDeps): boolean {
  return isSellerEmailConfigured(deps);
}

export function isSellerEmailSendEnabled(deps?: NotifySellerDeps): boolean {
  return readEnv(deps, "QUICKEXIT_ENABLE_SELLER_EMAIL") === "1";
}

export function resolveTransactionalFromAddress(deps?: NotifySellerDeps): string | null {
  const from = readEnv(deps, "RESEND_FROM");
  return from || null;
}

export function classifySellerNotifySkip(
  deps?: NotifySellerDeps,
): Extract<SellerNotifyReason, "no_provider" | "disabled"> {
  if (!isSellerEmailConfigured(deps)) return "no_provider";
  return "disabled";
}

export function sanitizeEmailHeaderValue(value: string, max = 80): string {
  return value
    .replace(/[\r\n\u0000-\u001f\u007f]/g, " ")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function buildInquiryEmailPayload(input: {
  from: string;
  recipient: string;
  listingTitle: string;
  locale?: "ro" | "en";
}): InquiryEmailPayload {
  const title = sanitizeEmailHeaderValue(input.listingTitle) || "Anunț QuickExit";
  const locale = input.locale === "en" ? "en" : "ro";
  if (locale === "en") {
    return {
      from: input.from,
      to: [input.recipient],
      subject: `Details request: ${title}`,
      text: [
        "You received a details request on QuickExit.",
        `Listing: ${title}`,
        "Open your dashboard for the buyer's phone number.",
        "QuickExit does not process the transaction price and does not hold funds in custody.",
      ].join("\n"),
    };
  }
  return {
    from: input.from,
    to: [input.recipient],
    subject: `Solicitare detalii: ${title}`,
    text: [
      "Ai primit o solicitare de detalii pe QuickExit.",
      `Anunț: ${title}`,
      "Deschide dashboard-ul pentru telefonul cumpărătorului.",
      "QuickExit nu procesează prețul tranzacției și nu ține fonduri în custodie.",
    ].join("\n"),
  };
}

export async function notifySellerOfInquiry(
  input: {
    sellerEmail: string | null;
    listingTitle: string;
    listingId: string;
    locale?: "ro" | "en";
  },
  deps?: NotifySellerDeps,
): Promise<SellerNotifyResult> {
  const recipient = input.sellerEmail?.trim().toLowerCase() ?? "";
  if (!recipient || !recipient.includes("@")) {
    return { ok: false, reason: "missing_recipient" };
  }

  if (!isSellerEmailConfigured(deps)) {
    return { ok: false, reason: "no_provider" };
  }

  if (!isSellerEmailSendEnabled(deps)) {
    return { ok: false, reason: "disabled" };
  }

  const apiKey = readEnv(deps, "RESEND_API_KEY");
  const from = resolveTransactionalFromAddress(deps);
  if (!apiKey || !from) {
    return { ok: false, reason: "no_provider" };
  }

  const fetchImpl = deps?.fetchImpl ?? fetch;
  const payload = buildInquiryEmailPayload({
    from,
    recipient,
    listingTitle: input.listingTitle,
    locale: input.locale,
  });

  try {
    const response = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.warn("[notifySeller] provider rejected send", {
        listingId: input.listingId,
        status: response.status,
      });
      return { ok: false, reason: "send_failed" };
    }

    return { ok: true, reason: "sent", channel: "resend" };
  } catch {
    console.warn("[notifySeller] send threw", { listingId: input.listingId });
    return { ok: false, reason: "send_failed" };
  }
}

export function notificationStatusFromResult(
  result: SellerNotifyResult,
):
  | "sent"
  | "failed"
  | "skipped_no_provider"
  | "skipped_disabled"
  | "skipped_missing_recipient" {
  if (result.ok) return "sent";
  if (result.reason === "no_provider") return "skipped_no_provider";
  if (result.reason === "disabled") return "skipped_disabled";
  if (result.reason === "missing_recipient") return "skipped_missing_recipient";
  return "failed";
}

export function notificationErrorCodeFromResult(
  result: SellerNotifyResult,
): string | null {
  if (result.ok) return null;
  return result.reason;
}
