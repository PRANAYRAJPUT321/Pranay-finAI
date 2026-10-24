import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/server/auth/current";
import { AuthError } from "@/server/auth/guards";
import type { SessionUser } from "@/server/auth/session";

export class ApiError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

/** Rejects cross-site state-changing requests (defence in depth on top of SameSite cookies). */
function sameOrigin(req: NextRequest) {
  if (req.method === "GET" || req.method === "HEAD") return true;
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

type Handler<P> = (ctx: { req: NextRequest; user: SessionUser; params: P }) => Promise<unknown>;

export function withUser<P = Record<string, string>>(handler: Handler<P>, errorTypes: (new (...a: never[]) => Error)[] = []) {
  return async (req: NextRequest, ctx: { params: Promise<P> }) => {
    if (!sameOrigin(req)) return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 });
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    try {
      const result = await handler({ req, user, params: await ctx.params });
      return result instanceof NextResponse ? result : NextResponse.json(result ?? { ok: true });
    } catch (e) {
      if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
      if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
      if (e instanceof z.ZodError) return NextResponse.json({ error: e.issues[0]?.message ?? "Invalid input" }, { status: 400 });
      if (errorTypes.some((T) => e instanceof T)) return NextResponse.json({ error: (e as Error).message }, { status: 409 });
      console.error("[api] unexpected error", e);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
  };
}

export async function readJson(req: NextRequest): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? body : {};
  } catch {
    throw new ApiError("Invalid JSON body");
  }
}
