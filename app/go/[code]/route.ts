import { NextRequest, NextResponse } from "next/server";
import {
  ATTRIBUTION_COOKIE_NAME,
  cookieOptionsForAttribution,
} from "@/lib/attribution";
import { buildChannelRedirect } from "@/lib/channelLinks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;
  const url = request.nextUrl;
  const built = buildChannelRedirect({
    code,
    origin: url.origin,
    content: url.searchParams.get("v") || url.searchParams.get("content"),
    to: url.searchParams.get("to"),
    existingCookie: request.cookies.get(ATTRIBUTION_COOKIE_NAME)?.value ?? null,
  });
  const response = NextResponse.redirect(built.location, 302);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Robots-Tag", "noindex");
  if (built.setCookie) {
    response.cookies.set(built.setCookie.name, built.setCookie.value, {
      ...cookieOptionsForAttribution(url.protocol),
      ...built.setCookie.options,
    });
  }
  return response;
}
