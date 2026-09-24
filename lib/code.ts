import { randomInt } from "node:crypto";

/**
 * Abeceda bez matoucích znaků: vynecháno I, O, 0, 1
 * (aby nešlo zaměnit O/0 nebo I/1 při opisování z obrazovky).
 */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const LENGTH = 6;

/** Vygeneruje kryptograficky náhodný kód, např. "8G4VWW". */
export function generateCode(): string {
  let code = "";
  for (let i = 0; i < LENGTH; i++) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return code;
}

/**
 * Normalizace kódu při ověřování — case-insensitive, odolné vůči mezerám.
 * "  8g4vwwq " → "8G4VWWQ"
 */
export function normalizeCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}
