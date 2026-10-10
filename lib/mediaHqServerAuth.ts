import {
  resolveHqAdminPageAuth,
  type HqAdminPageAuth,
} from "@/lib/hqAdminPageAuth";

export type MediaHqPageAuth = HqAdminPageAuth;

/**
 * Server-only HQ gate for Media ops page.
 * Delegates to the canonical HQ allowlist (cookie session + HQ_ADMIN_EMAILS).
 */
export async function resolveMediaHqPageAuth(): Promise<MediaHqPageAuth> {
  return resolveHqAdminPageAuth();
}
