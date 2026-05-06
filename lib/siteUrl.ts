export function getSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "https://quickexit-app.vercel.app";

  return raw.replace(/\/+$/, "");
}
