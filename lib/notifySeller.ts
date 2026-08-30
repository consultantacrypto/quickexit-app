/**
 * Provider-neutral seller notification boundary.
 * Never logs phone, email, or message bodies.
 * Does not send unless QUICKEXIT_ENABLE_SELLER_EMAIL=1 and a provider is configured.
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

export function hasEmailProviderConfig(): boolean {
  const resend = Boolean(process.env.RESEND_API_KEY?.trim());
  const smtp = Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_FROM?.trim() &&
      process.env.SMTP_USER?.trim(),
  );
  return resend || smtp;
}

export function isSellerEmailSendEnabled(): boolean {
  return process.env.QUICKEXIT_ENABLE_SELLER_EMAIL === "1";
}

export function resolveTransactionalFromAddress(): string | null {
  const from =
    process.env.RESEND_FROM?.trim() ||
    process.env.EMAIL_FROM?.trim() ||
    process.env.SMTP_FROM?.trim() ||
    "";
  return from || null;
}

export function classifySellerNotifySkip(): Extract<
  SellerNotifyReason,
  "no_provider" | "disabled"
> {
  if (!hasEmailProviderConfig()) return "no_provider";
  return "disabled";
}

export async function notifySellerOfInquiry(input: {
  sellerEmail: string | null;
  listingTitle: string;
  listingId: string;
}): Promise<SellerNotifyResult> {
  const recipient = input.sellerEmail?.trim().toLowerCase() ?? "";
  if (!recipient || !recipient.includes("@")) {
    return { ok: false, reason: "missing_recipient" };
  }

  if (!hasEmailProviderConfig()) {
    return { ok: false, reason: "no_provider" };
  }

  if (!isSellerEmailSendEnabled()) {
    return { ok: false, reason: "disabled" };
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = resolveTransactionalFromAddress();
  if (!apiKey || !from) {
    // SMTP is detected but not implemented (no nodemailer dependency).
    return { ok: false, reason: "no_provider" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [recipient],
        subject: `Solicitare detalii: ${input.listingTitle.slice(0, 80)}`,
        text: [
          "Ai primit o solicitare de detalii pe QuickExit.",
          `Anunț: ${input.listingTitle}`,
          "Deschide dashboard-ul pentru telefonul cumpărătorului.",
          "QuickExit nu procesează prețul tranzacției și nu ține fonduri în custodie.",
        ].join("\n"),
      }),
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
): "sent" | "failed" | "skipped_no_provider" | "skipped_disabled" {
  if (result.ok) return "sent";
  if (result.reason === "no_provider") return "skipped_no_provider";
  if (result.reason === "disabled" || result.reason === "missing_recipient") {
    return result.reason === "disabled" ? "skipped_disabled" : "skipped_no_provider";
  }
  return "failed";
}
