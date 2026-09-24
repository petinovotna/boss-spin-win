# BOSS — Spin & Win

Event registrační aplikace: návštěvník se zaregistruje → dostane unikátní kód → hosteska kód ověří a označí jako využitý. Jeden e-mail = jedna registrace = jeden kód.

- **Veřejná stránka:** `/` — registrace (mobile-first, BOSS vizuál)
- **Stránka pro hostesky:** `/verify` — ověření a redeem kódu (chráněno event PINem)

Stack: **Next.js (App Router) + TypeScript + Supabase (PostgreSQL)**.

---

## 1. Setup

### Předpoklady
- Node.js 18.18+ (ideálně 20+)
- Účet na [Supabase](https://supabase.com) (free tier stačí)
- Účet na [Vercel](https://vercel.com) pro nasazení (free tier stačí)

### Instalace
```bash
cd boss-spin-win
npm install
```

### Databáze (Supabase)
1. Vytvoř nový projekt na [supabase.com](https://supabase.com).
2. V dashboardu otevři **SQL Editor → New query**.
3. Zkopíruj obsah [`supabase/migration.sql`](supabase/migration.sql), vlož a klikni **Run**.
4. Tím vznikne tabulka `registrations` s UNIQUE omezením na e-mail i kód a zapnutým RLS.

---

## 2. Proměnné prostředí

Zkopíruj `.env.local.example` → `.env.local` a doplň hodnoty:

```bash
cp .env.local.example .env.local
```

| Proměnná | Kde ji najdeš / jak vytvořit |
|----------|------------------------------|
| `SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → **service_role** key. **Tajné!** Jen na serveru. |
| `EVENT_HOSTESS_PIN` | Vymyšlený sdílený PIN pro hostesky (např. `7392`). |
| `SESSION_SECRET` | Náhodný dlouhý řetězec. Vygeneruj: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

> ⚠️ `.env.local` se **necommituje** (je v `.gitignore`). `service_role` klíč nikdy nedávej do frontendu ani do gitu.

---

## 3. Spuštění lokálně

```bash
npm run dev
```

- Registrace: <http://localhost:3000>
- Hostesky: <http://localhost:3000/verify>

Otestuj celý flow: zaregistruj se → dostaneš kód → na `/verify` zadej PIN → ověř kód → označ jako využitý.

---

## 4. DB migrace

Schéma je v [`supabase/migration.sql`](supabase/migration.sql). Spouští se ručně v Supabase SQL Editoru (viz Setup). Skript je idempotentní (`if not exists`), takže ho lze spustit opakovaně bez chyby.

Tabulka `registrations`:

| pole | význam |
|------|--------|
| `id` | UUID, primární klíč |
| `first_name`, `last_name` | jméno a příjmení |
| `email` | normalizovaný (lowercase, trim), **UNIQUE** |
| `code` | `BOSS-XXXXXX`, **UNIQUE** |
| `consent`, `consent_at` | souhlas pro účast + čas |
| `marketing_consent`, `marketing_consent_at` | nepovinný marketingový opt-in + čas |
| `created_at` | čas registrace |
| `redeemed_at` | `NULL` = nevyužito; jinak čas využití |
| `redeemed_by` | kdo redeem provedl |

---

## 5. Deployment (Vercel)

1. Nahraj složku `boss-spin-win` do Git repozitáře (GitHub).
2. Na [vercel.com](https://vercel.com) → **Add New Project** → naimportuj repo.
   - Pokud je aplikace v podsložce, nastav **Root Directory** = `boss-spin-win`.
3. V **Settings → Environment Variables** přidej všechny 4 proměnné z `.env.local`.
4. **Deploy.** Vercel zajistí HTTPS automaticky.
5. Vygeneruj QR kód mířící na produkční URL (root `/`).

> `/verify` je chráněné PINem a `robots` je nastaven na neindexovat. Hosteskám pošli přímý odkaz `…/verify` + PIN.

---

## 6. Jak změnit event copy nebo hero fotku

- **Texty (headline, intro, hlášky, patička):** uprav [`config/content.ts`](config/content.ts). Nikde jinde v kódu se copy nepíše.
- **Hero fotka:** nahraď soubor `public/hero.jpg` (stejný název), nebo změň cestu `hero` v `config/content.ts`.
- **Logo:** nahraď `public/boss_logo.png`.
- **Odkaz na zásady zpracování údajů:** `privacyUrl` v `config/content.ts`.

Po změně stačí nový deploy (na Vercelu automaticky po push do Gitu).

---

## 7. Jak získat data z registrací po eventu

**Varianta A — Supabase UI:** Dashboard → **Table Editor → registrations** → tlačítko **Export** (CSV).

**Varianta B — SQL Editor** (např. jen využité kódy):
```sql
select first_name, last_name, email, segment, code, created_at, redeemed_at, marketing_consent
from registrations
order by created_at;
```
Výsledek jde stáhnout jako CSV.

> Pro přenos do CRM: e-maily s `marketing_consent = true` jsou ty, které lze použít pro marketing. Ostatní jen pro účast v akci.

---

## 8. Bezpečnost — shrnutí

- Veřejný klient **nemá** přístup k databázi (RLS zapnuté, žádné policy). Vše jde přes serverové API se `service_role` klíčem.
- Redeem endpoint je chráněný — nelze označit vlastní kód jako využitý bez PINu.
- PIN se ověřuje server-side; žádný secret není ve frontend JS (jen v env proměnných).
- Redeem je atomický na úrovni DB (`UPDATE … WHERE redeemed_at IS NULL`) — dvě hostesky současně redeemnout stejný kód nemohou.
- Unikátnost e-mailu i kódu garantuje databáze (UNIQUE index), ne jen frontend.

### Co dořešit před ostrým provozem
- Doplnit finální **odkaz na zásady zpracování osobních údajů** (`privacyUrl`).
- Zvážit **rate-limiting** na `/api/register` a `/api/hostess/login` (např. Vercel/Upstash) proti spamu a hádání PINu.
- Finální event **copy** (headline/intro).
