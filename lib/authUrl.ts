/** Hash-ul URL conține token-uri Supabase după OAuth / magic link (implicit flow). */
export function hasAuthTokensInHash(): boolean {
  if (typeof window === "undefined") return false;
  const raw = window.location.hash?.replace(/^#/, "") ?? "";
  if (!raw) return false;
  const params = new URLSearchParams(raw);
  return params.has("access_token") || params.has("refresh_token");
}

/** Elimină tăcut fragmentul cu token-uri din bara de adrese, fără reload. */
export function stripAuthHashFromUrl(): void {
  if (typeof window === "undefined") return;
  if (!hasAuthTokensInHash()) return;
  const clean = `${window.location.pathname}${window.location.search}`;
  window.history.replaceState(window.history.state, "", clean || "/");
}
