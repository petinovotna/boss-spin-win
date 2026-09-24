import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/stats — CHRÁNĚNÝ (jen přihlášená hosteska)
 * Vrátí { total, redeemed } — počet vygenerovaných a využitých kódů.
 */
export async function GET() {
  const jar = await cookies();
  if (!verifySession(jar.get(SESSION_COOKIE)?.value)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();

  const total = await db
    .from("registrations")
    .select("*", { count: "exact", head: true });

  const redeemed = await db
    .from("registrations")
    .select("*", { count: "exact", head: true })
    .not("redeemed_at", "is", null);

  if (total.error || redeemed.error) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({
    total: total.count ?? 0,
    redeemed: redeemed.count ?? 0,
  });
}
