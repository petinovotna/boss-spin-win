import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/hostess/session — vrátí, zda je hosteska přihlášená (pro UI /verify). */
export async function GET() {
  const jar = await cookies();
  return NextResponse.json({
    authenticated: verifySession(jar.get(SESSION_COOKIE)?.value),
  });
}
