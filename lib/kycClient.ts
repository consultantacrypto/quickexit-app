import { supabase } from "@/lib/supabase";

/** Headers pentru /api/kyc/start — include Bearer când sesiunea e în localStorage (Vercel-friendly). */
export async function buildKycStartRequestInit(
  userId: string
): Promise<RequestInit> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  return {
    method: "POST",
    headers,
    body: JSON.stringify({ userId }),
  };
}
