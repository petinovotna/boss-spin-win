import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Jednoduchá autentizace hostesek přes sdílený event PIN.
 * - PIN se ověřuje server-side proti EVENT_HOSTESS_PIN (env).
 * - Po úspěchu se vydá podepsaná (HMAC) session cookie.
 * - Chráněné endpointy ověřují podpis cookie. Žádný secret není ve frontendu.
 */

export const SESSION_COOKIE = "hostess_session";
const MAX_AGE_SECONDS = 60 * 60 * 12; // 12 h — délka směny

function sessionSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("Chybí SESSION_SECRET v prostředí (.env.local).");
  return s;
}

/** Bezpečné (constant-time) porovnání PINu. */
export function checkPin(input: string): boolean {
  const pin = process.env.EVENT_HOSTESS_PIN;
  if (!pin) throw new Error("Chybí EVENT_HOSTESS_PIN v prostředí (.env.local).");
  const a = Buffer.from(String(input));
  const b = Buffer.from(pin);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Vytvoří podepsaný session token: base64url(payload).base64url(hmac). */
export function signSession(): string {
  const payload = JSON.stringify({ role: "hostess", iat: Date.now() });
  const data = Buffer.from(payload).toString("base64url");
  const sig = createHmac("sha256", sessionSecret()).update(data).digest("base64url");
  return `${data}.${sig}`;
}

/** Ověří platnost session tokenu (podpis + expirace). */
export function verifySession(token: string | undefined | null): boolean {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot < 0) return false;
  const data = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expected = createHmac("sha256", sessionSecret()).update(data).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  if (!timingSafeEqual(a, b)) return false;

  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString());
    if (payload.role !== "hostess") return false;
    if (typeof payload.iat !== "number") return false;
    if (Date.now() - payload.iat > MAX_AGE_SECONDS * 1000) return false;
    return true;
  } catch {
    return false;
  }
}

export const SESSION_MAX_AGE = MAX_AGE_SECONDS;
