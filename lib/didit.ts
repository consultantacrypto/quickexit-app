import crypto from "crypto";

/** Didit session statuses → profiles.kyc_status (aligned with Stripe Identity webhook). */
export function mapDiditStatusToKycStatus(diditStatus: string): string | null {
  const map: Record<string, string> = {
    Approved: "verified",
    "In Review": "processing",
    "In Progress": "processing",
    Declined: "requires_input",
    Resubmitted: "requires_input",
    Abandoned: "canceled",
    Expired: "canceled",
    "KYC Expired": "canceled",
  };
  return map[diditStatus.trim()] ?? null;
}

/** Whole-valued floats serialised as ints (Didit canonical JSON). */
export function shortenFloats(data: unknown): unknown {
  if (Array.isArray(data)) return data.map(shortenFloats);
  if (data !== null && typeof data === "object") {
    return Object.fromEntries(
      Object.entries(data as Record<string, unknown>).map(([key, value]) => [
        key,
        shortenFloats(value),
      ])
    );
  }
  if (typeof data === "number" && !Number.isInteger(data) && data % 1 === 0) {
    return Math.trunc(data);
  }
  return data;
}

/** Recursive lexicographic key sort before canonical stringify. */
export function sortKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(sortKeys);
  if (obj !== null && typeof obj === "object") {
    return Object.keys(obj as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortKeys((obj as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return obj;
}

export function canonicalJsonForSignatureV2(parsed: unknown): string {
  return JSON.stringify(sortKeys(shortenFloats(parsed)));
}

export function verifyDiditSignatureV2(
  parsedBody: unknown,
  signatureHeader: string | null,
  timestampHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader?.trim() || !timestampHeader?.trim() || !secret) {
    return false;
  }

  const timestamp = parseInt(timestampHeader, 10);
  if (!Number.isFinite(timestamp)) return false;

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > 300) return false;

  const canonical = canonicalJsonForSignatureV2(parsedBody);
  const expected = crypto.createHmac("sha256", secret).update(canonical, "utf8").digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signatureHeader.trim(), "utf8");
  if (a.length !== b.length) return false;

  return crypto.timingSafeEqual(a, b);
}

export function extractDiditUserId(payload: {
  vendor_data?: unknown;
  metadata?: unknown;
}): string | null {
  const vendor = payload.vendor_data;
  if (typeof vendor === "string" && vendor.trim()) return vendor.trim();

  const meta = payload.metadata;
  if (meta && typeof meta === "object") {
    const m = meta as Record<string, unknown>;
    const fromMeta = m.userId ?? m.user_id;
    if (typeof fromMeta === "string" && fromMeta.trim()) return fromMeta.trim();
  }

  return null;
}
