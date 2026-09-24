import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizeCode } from "@/lib/code";
import { maskEmail } from "@/lib/email";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/verify  — CHRÁNĚNÝ (jen přihlášená hosteska)
 * Body: { code }
 * Najde registraci podle kódu a vrátí stav. NEPROVÁDÍ redeem.
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
  const { data, error } = await db
    .from("registrations")
    .select("first_name,last_name,email,code,redeemed_at")
    .eq("code", code)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "server_error" }, { status: 500 });
  if (!data) return NextResponse.json({ status: "not_found" });

  return NextResponse.json({
    status: data.redeemed_at ? "already_redeemed" : "valid",
    firstName: data.first_name,
    lastName: data.last_name,
    email: maskEmail(data.email),
    code: data.code,
    redeemedAt: data.redeemed_at ?? null,
  });
}
