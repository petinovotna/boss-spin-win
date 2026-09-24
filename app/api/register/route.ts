import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { generateCode } from "@/lib/code";
import { normalizeEmail, isValidEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/register
 * Body: { firstName, lastName, email, consent, marketingConsent }
 * Vytvoří registraci a vrátí unikátní kód. Duplicitní e-mail → 409.
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // --- Server-side validace ---
  const firstName = String(body.firstName ?? "").trim();
  const lastName = String(body.lastName ?? "").trim();
  const emailRaw = String(body.email ?? "");
  const segment = String(body.segment ?? "").trim();
  const consent = body.consent === true;
  const marketing = body.marketingConsent === true;

  if (!firstName || firstName.length > 100)
    return NextResponse.json({ error: "missing_first_name" }, { status: 400 });
  if (!lastName || lastName.length > 100)
    return NextResponse.json({ error: "missing_last_name" }, { status: 400 });
  if (!isValidEmail(emailRaw))
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  if (!segment || segment.length > 100)
    return NextResponse.json({ error: "missing_segment" }, { status: 400 });
  if (!consent)
    return NextResponse.json({ error: "consent_required" }, { status: 400 });

  const email = normalizeEmail(emailRaw);
  const db = supabaseAdmin();
  const now = new Date().toISOString();

  // Přátelská předběžná kontrola (rychlá hláška). Skutečnou garanci dělá UNIQUE index níže.
  const { data: existing, error: selErr } = await db
    .from("registrations")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (selErr) return NextResponse.json({ error: "server_error" }, { status: 500 });
  if (existing)
    return NextResponse.json({ error: "already_registered" }, { status: 409 });

  // Vlož s vygenerovaným kódem. Při kolizi kódu (velmi vzácné) přegeneruj.
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = generateCode();
    const { data, error } = await db
      .from("registrations")
      .insert({
        first_name: firstName,
        last_name: lastName,
        email,
        segment,
        code,
        consent: true,
        consent_at: now,
        marketing_consent: marketing,
        marketing_consent_at: marketing ? now : null,
      })
      .select("code")
      .single();

    if (!error && data) {
      return NextResponse.json({ code: data.code }, { status: 201 });
    }

    if (error) {
      // 23505 = unique_violation (Postgres)
      const detail = `${error.message} ${error.details ?? ""}`.toLowerCase();
      if (error.code === "23505") {
        if (detail.includes("reg_email_unique") || detail.includes("email")) {
          // Race: mezitím se stejný e-mail zaregistroval jiným requestem.
          return NextResponse.json({ error: "already_registered" }, { status: 409 });
        }
        if (detail.includes("reg_code_unique") || detail.includes("code")) {
          continue; // kolize kódu → zkus jiný
        }
      }
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "code_generation_failed" }, { status: 500 });
}
