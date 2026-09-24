/**
 * Veškeré texty a asset cesty na jednom místě.
 * CHCEŠ ZMĚNIT COPY NEBO FOTKU? Uprav tady — nikde jinde v kódu se to nepíše.
 *
 * Hero fotka: nahraď soubor `public/hero.jpg` (nebo změň cestu `hero` níže).
 * Logo:       nahraď soubor `public/boss_logo.png`.
 */
export const content = {
  // --- Assety ---
  hero: "/hero.jpg",
  logo: "/boss_logo.png",

  // --- Veřejná stránka (Spin & Win) ---
  headline: "SPIN & WIN",
  intro:
    "Vyplňte své údaje a zatočte kolem štěstí. Zobrazený kód ukažte hostesce u kola. Získejte přístup k exkluzivním kolekcím a odměnám BOSS.",

  // Text tlačítka (CTA)
  cta: "Získat kód",

  // Dotaz na sortiment — možnosti lze libovolně upravit
  segmentLabel: "O jaký sortiment BOSS máte největší zájem?",
  segmentPlaceholder: "Vyberte možnost",
  segmentOptions: ["Pánská móda", "Dámská móda", "Obuv", "Doplňky", "Parfémy"],

  // Odkaz na zásady zpracování osobních údajů
  privacyUrl: "https://www.lafm.cz/ochrana-osobnich-udaju",

  // Souhlas nutný pro ÚČAST v akci (povinný)
  consentLabel:
    "Souhlasím se zpracováním osobních údajů pro účast v této akci v souladu se",
  consentLinkText: "zásadami zpracování osobních údajů",

  // Marketingový souhlas (NEPOVINNÝ, oddělený od účasti)
  marketingLabel:
    "Chci dostávat novinky, nabídky a marketingová sdělení BOSS (nepovinné).",

  // Success screen
  successTitle: "VÁŠ KÓD",
  successHint: "Ukažte tento kód hostesce.",
  copyLabel: "Zkopírovat kód",
  copiedLabel: "Zkopírováno ✓",

  // Chybové / stavové hlášky
  alreadyRegistered: "Tento e-mail již byl pro akci registrován.",
  genericError: "Něco se pokazilo. Zkuste to prosím znovu.",
  networkError: "Chyba připojení. Zkontrolujte internet a zkuste to znovu.",

  // --- Patička ---
  footer: "BOSS · Spin & Win",
} as const;
