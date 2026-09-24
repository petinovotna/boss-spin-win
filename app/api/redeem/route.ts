import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizeCode } from "@/lib/code";
import { maskEmail } from "@/lib/email";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/redeem  — CHRÁNĚNÝ (jen přihlášená hosteska)
 * Body: { code }
 * ATOMICKY označí kód jako využitý. Dvě hostesky současně → uspěje jen první.
 */
export async function POST(req: Request) {
  const jar = await cookies();
  if (!verifySession(jar.get(SESSION_COOKIE)?.value)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const code = normalizeCode(String(body.code ?? ""));
  if (!code || code === "BOSS-") {
    return NextResponse.json({ error: "missing_code" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const now = new Date().toISOString();

  // Atomická podmínka: UPDATE ... WHERE code=? AND redeemed_at IS NULL
  // Uspěje jen tehdy, když kód existuje a JEŠTĚ NENÍ využitý.
  const { data: updated, error } = await db
    .from("registrations")
    .update({ redeemed_at: now, redeemed_by: "hostess" })
    .eq("code", code)
    .is("redeemed_at", null)
    .select("first_name,last_name,email,code,redeemed_at");

  if (error) return NextResponse.json({ error: "server_error" }, { status: 500 });

  if (updated && updated.length === 1) {
    const r = updated[0];
    return NextResponse.json({
      status: "redeemed",
      firstName: r.first_name,
      lastName: r.last_name,
      email: maskEmail(r.email),
      code: r.code,
      redeemedAt: r.redeemed_at,
    });
  }

  // 0 řádků → buď kód neexistuje, nebo už byl mezitím využitý. Rozliš to.
  const { data: existing } = await db
    .from("registrations")
    .select("code,redeemed_at")
    .eq("code", code)
    .maybeSingle();

  if (!existing) return NextResponse.json({ status: "not_found" });
  return NextResponse.json({
    status: "already_redeemed",
    redeemedAt: existing.redeemed_at,
  });
}
