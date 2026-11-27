/**
 * Resend-only valuation report. Off unless VALUATION_REPORT_EMAIL_ENABLED=true.
 * Never logs the recipient address.
 */
import { resolveTransactionalFromAddress } from "@/lib/notifySeller";
import { isValuationReportEmailEnabled } from "@/lib/qeCarValuation";

export type ValuationReportSendResult = "sent" | "disabled" | "failed";

export async function sendValuationReportEmail(
  input: { to: string; subject: string; text: string },
  deps?: {
    fetchImpl?: typeof fetch;
    env?: Record<string, string | undefined>;
  },
): Promise<ValuationReportSendResult> {
  const env = deps?.env ?? process.env;
  if (!isValuationReportEmailEnabled(env)) return "disabled";

  const recipient = input.to.trim().toLowerCase();
  if (!recipient || recipient.includes("\n") || recipient.includes("\r")) return "failed";
  if (input.text.toLowerCase().includes(recipient) || input.subject.toLowerCase().includes(recipient)) {
    return "failed";
  }

  const apiKey = String(env.RESEND_API_KEY ?? "").trim();
  const from = resolveTransactionalFromAddress({ env });
  if (!apiKey || !from) return "failed";

  const fetchImpl = deps?.fetchImpl ?? fetch;
  try {
    const response = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [recipient],
        subject: input.subject,
        text: input.text,
      }),
    });
    if (!response.ok) {
      console.warn("[qe-valuation] report send rejected", { status: response.status });
      return "failed";
    }
    return "sent";
  } catch {
    console.warn("[qe-valuation] report send failed");
    return "failed";
  }
}
