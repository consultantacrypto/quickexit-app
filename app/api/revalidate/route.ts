import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

/** Token on-demand revalidation — setează REVALIDATE_SECRET în Vercel pentru producție. */
const REVALIDATE_SECRET =
  process.env.REVALIDATE_SECRET?.trim() || "quickexit_force_2026";

export const dynamic = "force-dynamic";

async function handleRevalidate(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");

  if (!secret || secret !== REVALIDATE_SECRET) {
    return NextResponse.json(
      { revalidated: false, message: "Invalid secret" },
      { status: 401 }
    );
  }

  revalidatePath("/", "layout");

  return NextResponse.json({
    revalidated: true,
    now: Date.now(),
  });
}

export async function GET(request: NextRequest) {
  return handleRevalidate(request);
}

export async function POST(request: NextRequest) {
  return handleRevalidate(request);
}
