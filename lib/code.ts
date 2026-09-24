import { randomInt } from "node:crypto";

/**
 * Abeceda bez matoucích znaků: vynecháno I, O, 0, 1
 * (aby nešlo zaměnit O/0 nebo I/1 při opisování z obrazovky).
 */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PREFIX = "BOSS-";
const LENGTH = 6;

/** Vygeneruje kryptograficky náhodný kód, např. "BOSS-7K4P9X". */
export function generateCode(): string {
  let body = "";
  for (let i = 0; i < LENGTH; i++) {
    body += ALPHABET[randomInt(ALPHABET.length)];
  }
  return PREFIX + body;
}

/**
 * Normalizace kódu při ověřování — case-insensitive, odolné vůči mezerám.
 * "  boss-7k4p9x " → "BOSS-7K4P9X"
 * Když uživatel zadá jen tělo bez prefixu, prefix doplníme.
 */
export function normalizeCode(input: string): string {
  let c = input.trim().toUpperCase().replace(/\s+/g, "");
  if (c && !c.startsWith(PREFIX)) {
    // dovol i variantu "BOSS7K4P9X" bez pomlčky
    c = c.replace(/^BOSS-?/, "");
    c = PREFIX + c;
  }
  return c;
}
