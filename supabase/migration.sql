-- ============================================================
-- BOSS Spin & Win — databázové schéma
-- Spusť v Supabase: Dashboard → SQL Editor → New query → vlož → Run
-- ============================================================

-- gen_random_uuid()
create extension if not exists "pgcrypto";

create table if not exists registrations (
  id                    uuid primary key default gen_random_uuid(),
  first_name            text not null,
  last_name             text not null,
  email                 text not null,            -- ukládá se normalizovaný: trim + lowercase
  phone                 text,                     -- telefonní číslo
  segment               text,                     -- zájem o sortiment (Pánská móda, Obuv, …)
  code                  text not null,            -- unikátní kód
  consent               boolean not null default false,   -- souhlas nutný pro účast
  consent_at            timestamptz,
  marketing_consent     boolean not null default false,   -- nepovinný marketingový opt-in
  marketing_consent_at  timestamptz,
  created_at            timestamptz not null default now(),
  redeemed_at           timestamptz,              -- NULL = nevyužito; jinak čas využití
  redeemed_by           text                      -- kdo redeem provedl (u sdíleného PINu = 'hostess')
);

-- Pro případ, že tabulka už existovala bez některých sloupců (bezpečné spustit opakovaně)
alter table registrations add column if not exists segment text;
alter table registrations add column if not exists phone text;

-- Unikátní e-mail → jeden člověk = jedna registrace (garance na úrovni DB)
create unique index if not exists reg_email_unique on registrations (email);

-- Unikátní kód
create unique index if not exists reg_code_unique on registrations (code);

-- Rychlé hledání nevyužitých / dle času
create index if not exists reg_redeemed_at_idx on registrations (redeemed_at);

-- ============================================================
-- Row Level Security: zapnuto, ŽÁDNÉ policy.
-- Anonymní/veřejný klient (anon key) se tak k datům vůbec nedostane.
-- Server používá SERVICE ROLE key, který RLS obchází — veškerý přístup
-- k datům jde jen přes naše API routes.
-- ============================================================
alter table registrations enable row level security;
