import { isHqUuid } from "@/lib/hqOverview";

export type VerifiedQeChecklist = {
  docs: boolean;
  vin: boolean;
  photos: boolean;
};

export type VerifiedQePublicState = {
  id: string;
  verified_qe: boolean;
  verified_docs: boolean;
  verified_vin: boolean;
  verified_photos: boolean;
  verified_at: string | null;
};

export type VerifiedQePlan = {
  listingId: string;
  actorUserId: string;
  grant: boolean;
  docs: boolean;
  vin: boolean;
  photos: boolean;
};

export type VerifiedQeFailure = {
  ok: false;
  status: number;
  error: string;
  error_code: string;
};

export type VerifiedQeApplyResult =
  | { ok: true; listing: VerifiedQePublicState }
  | VerifiedQeFailure;

type AuthenticatedWriter = {
  ok: true;
  userId: string;
  apply: (plan: VerifiedQePlan) => Promise<VerifiedQeApplyResult>;
};

type AuthDenied = { ok: false; status: number; error: string };

export type VerifiedQeMutationDeps = {
  authenticate: (authorization: string | null) => Promise<AuthenticatedWriter | AuthDenied>;
};

function failure(status: number, error: string, error_code: string): VerifiedQeFailure {
  return { ok: false, status, error, error_code };
}

function readBool(value: unknown): boolean {
  return value === true;
}

export function planVerifiedQeMutation(input: {
  actorUserId: string | null;
  body: unknown;
}): { ok: true; plan: VerifiedQePlan } | VerifiedQeFailure {
  if (!input.actorUserId || !isHqUuid(input.actorUserId)) {
    return failure(401, "authentication_required", "auth_required");
  }
  if (!input.body || typeof input.body !== "object" || Array.isArray(input.body)) {
    return failure(400, "invalid_request", "invalid_request");
  }
  const body = input.body as Record<string, unknown>;
  const listingId = typeof body.id === "string" ? body.id.trim() : "";
  if (!isHqUuid(listingId)) {
    return failure(400, "invalid_id", "invalid_id");
  }
  const action = body.action;
  if (action !== "grant" && action !== "revoke") {
    return failure(400, "invalid_action", "invalid_action");
  }
  const docs = readBool(body.docs);
  const vin = readBool(body.vin);
  const photos = readBool(body.photos);
  if (action === "grant" && !(docs && vin && photos)) {
    return failure(400, "incomplete_checks", "incomplete_checks");
  }
  return {
    ok: true,
    plan: {
      listingId,
      actorUserId: input.actorUserId,
      grant: action === "grant",
      docs,
      vin,
      photos,
    },
  };
}

export function mapVerifiedQeWriteError(error: {
  code?: string | null;
  message?: string | null;
}): VerifiedQeFailure {
  const message = String(error.message ?? "");
  const code = String(error.code ?? "");
  const blob = `${code} ${message}`.toLowerCase();
  if (
    blob.includes("pgrst202") ||
    blob.includes("42883") ||
    blob.includes("42703") ||
    blob.includes("pgrst204") ||
    (blob.includes("hq_set_listing_verified_qe") && blob.includes("schema cache")) ||
    (blob.includes("verified_qe") &&
      (blob.includes("does not exist") || blob.includes("could not find") || blob.includes("schema cache")))
  ) {
    return failure(503, "schema_missing", "schema_missing");
  }
  if (blob.includes("verified_qe_incomplete") || code === "23514") {
    return failure(400, "incomplete_checks", "incomplete_checks");
  }
  if (blob.includes("verified_qe_not_found")) {
    return failure(404, "not_found", "not_found");
  }
  if (blob.includes("verified_qe_forbidden") || code === "42501") {
    return failure(403, "forbidden", "forbidden");
  }
  return failure(500, "internal_error", "server_error");
}

export function readVerifiedQeRpcRow(
  listingId: string,
  data: unknown,
): VerifiedQePublicState | null {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return null;
  const record = row as Record<string, unknown>;
  const verifiedAt = record.verified_at;
  return {
    id: listingId,
    verified_qe: record.verified_qe === true,
    verified_docs: record.verified_docs === true,
    verified_vin: record.verified_vin === true,
    verified_photos: record.verified_photos === true,
    verified_at: typeof verifiedAt === "string" && verifiedAt.trim() ? verifiedAt : null,
  };
}

export async function executeVerifiedQeMutation(
  authorization: string | null,
  body: unknown,
  deps: VerifiedQeMutationDeps,
): Promise<{ status: number; listingId?: string; body: Record<string, unknown> }> {
  const auth = await deps.authenticate(authorization);
  if (!auth.ok) {
    const status = auth.status === 403 ? 403 : auth.status === 401 ? 401 : auth.status;
    return {
      status,
      body: {
        success: false,
        error: auth.error,
        error_code: status === 403 ? "forbidden" : "auth_required",
      },
    };
  }

  const plan = planVerifiedQeMutation({ actorUserId: auth.userId, body });
  if (!plan.ok) {
    return {
      status: plan.status,
      body: { success: false, error: plan.error, error_code: plan.error_code },
    };
  }

  const applied = await auth.apply(plan.plan);
  if (!applied.ok) {
    return {
      status: applied.status,
      body: { success: false, error: applied.error, error_code: applied.error_code },
    };
  }

  return {
    status: 200,
    listingId: plan.plan.listingId,
    body: { success: true, listing: applied.listing },
  };
}
