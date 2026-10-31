/** `?oferta=1` or `#oferta` on a listing detail URL. Does not rewrite the URL. */
export function isListingOfferDeepLink(search: string, hash: string): boolean {
  const query = search.startsWith("?") ? search.slice(1) : search;
  if (new URLSearchParams(query).get("oferta") === "1") return true;

  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  let token = raw.split(/[?&]/)[0] ?? "";
  try {
    token = decodeURIComponent(token);
  } catch {
    // keep the raw token
  }
  return token === "oferta" || token === "oferta=1";
}
