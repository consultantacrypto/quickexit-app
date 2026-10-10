/**
 * Redirect safety for KYC verification URLs returned by /api/kyc/start.
 * Accept HTTPS only. No brittle hostname allowlist — providers may use multiple domains.
 */
export function isSafeKycRedirectUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}
