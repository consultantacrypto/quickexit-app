/** Client-safe Turnstile config (no secrets). */
export function isEvaluateTurnstileUiEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim());
}
