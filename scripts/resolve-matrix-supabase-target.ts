/**
 * Matrix target resolver: local loopback (default) OR Staging when QE_STAGING_MATRIX=1.
 * Never allows Production.
 */
import {
  assertLocalSupabaseTargets,
  assertLocalSupabaseWriteTarget,
} from "./assert-local-supabase-target";
import {
  assertStagingMatrixEnv,
  assertStagingSupabaseWriteTarget,
  STAGING_API_URL,
} from "./assert-staging-supabase-target";

const PRODUCTION_REF = "geywuzwbzecknokvnins";

export function resolveMatrixApiUrl(): string {
  if (process.env.QE_STAGING_MATRIX === "1" || process.env.QE_STAGING_MATRIX === "true") {
    const { apiUrl } = assertStagingMatrixEnv();
    if (apiUrl.includes(PRODUCTION_REF)) {
      throw new Error("STOP: Production refused in staging matrix mode");
    }
    return apiUrl;
  }
  return assertLocalSupabaseTargets().apiUrl;
}

export function resolveMatrixWriteTarget(raw?: string): string {
  if (process.env.QE_STAGING_MATRIX === "1" || process.env.QE_STAGING_MATRIX === "true") {
    return assertStagingSupabaseWriteTarget(
      raw ?? process.env.STAGING_SUPABASE_URL ?? STAGING_API_URL,
    );
  }
  return assertLocalSupabaseWriteTarget(raw);
}
