/**
 * Hard gate for Staging-only mutations / matrices.
 * Allows ONLY project ref nlnzlswjjplofpkhoxtr.
 * Aborts on Production geywuzwbzecknokvnins or any other cloud host.
 */
const PRODUCTION_REF = "geywuzwbzecknokvnins";
export const STAGING_REF = "nlnzlswjjplofpkhoxtr";
export const STAGING_API_URL = `https://${STAGING_REF}.supabase.co`;

export function assertStagingSupabaseWriteTarget(rawUrl: string | undefined): string {
  const url = String(rawUrl ?? "").trim().replace(/\/+$/, "");
  if (!url) throw new Error("STOP: Staging Supabase URL missing");

  const lower = url.toLowerCase();
  if (lower.includes(PRODUCTION_REF)) {
    throw new Error(`STOP: Production ref ${PRODUCTION_REF} refused`);
  }
  if (!lower.includes(STAGING_REF)) {
    throw new Error(`STOP: URL must target Staging ref ${STAGING_REF}`);
  }
  if (process.env.VERCEL_ENV === "production") {
    throw new Error("STOP: VERCEL_ENV=production");
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("STOP: invalid Staging URL");
  }
  if (parsed.protocol !== "https:") {
    throw new Error("STOP: Staging API URL must be https");
  }
  if (parsed.hostname !== `${STAGING_REF}.supabase.co`) {
    throw new Error(`STOP: unexpected Staging host ${parsed.hostname}`);
  }
  return `${parsed.protocol}//${parsed.hostname}`;
}

export function assertStagingMatrixEnv(
  env: Record<string, string | undefined> = process.env,
): { apiUrl: string } {
  if (env.QE_STAGING_MATRIX !== "1" && env.QE_STAGING_MATRIX !== "true") {
    throw new Error("STOP: set QE_STAGING_MATRIX=1 for Staging matrices");
  }
  const apiUrl = assertStagingSupabaseWriteTarget(
    env.STAGING_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL ?? STAGING_API_URL,
  );
  return { apiUrl };
}

if (process.argv[1]?.includes("assert-staging-supabase-target")) {
  try {
    const url = assertStagingSupabaseWriteTarget(
      process.env.STAGING_SUPABASE_URL ?? STAGING_API_URL,
    );
    console.log(`OK staging-write-target proven api=${url}`);
  } catch (e) {
    console.error(e instanceof Error ? e.message : "STOP");
    process.exit(1);
  }
}
