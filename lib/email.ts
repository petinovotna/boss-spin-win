/** Normalizace e-mailu = jednoznačný identifikátor: trim + lowercase. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Jednoduchá, ale rozumná validace formátu e-mailu.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  const e = email.trim();
  return e.length <= 254 && EMAIL_RE.test(e);
}

/** Maskování e-mailu pro zobrazení hostesce: "jan.novak@gmail.com" → "j***@gmail.com". */
export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at < 1) return "***";
  const first = email.slice(0, 1);
  const domain = email.slice(at + 1);
  return `${first}***@${domain}`;
}
