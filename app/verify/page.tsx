"use client";

import { useEffect, useRef, useState } from "react";

type VerifyResult =
  | { status: "valid"; firstName: string; lastName: string; email: string; code: string }
  | { status: "already_redeemed"; firstName?: string; lastName?: string; email?: string; code?: string; redeemedAt: string | null }
  | { status: "not_found" };

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("cs-CZ", {
    day: "numeric", month: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function VerifyPage() {
  const [authed, setAuthed] = useState<boolean | null>(null); // null = zjišťuje se
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinLoading, setPinLoading] = useState(false);

  const [code, setCode] = useState("");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [redeemedNow, setRedeemedNow] = useState<string | null>(null);
  const [stats, setStats] = useState<{ total: number; redeemed: number } | null>(null);

  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/hostess/session")
      .then((r) => r.json())
      .then((d) => setAuthed(!!d.authenticated))
      .catch(() => setAuthed(false));
  }, []);

  async function fetchStats() {
    try {
      const res = await fetch("/api/stats");
      if (res.ok) setStats(await res.json());
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    if (authed) fetchStats();
  }, [authed]);

  async function handleLogin(ev: React.FormEvent) {
    ev.preventDefault();
    if (pinLoading) return;
    setPinError(null);
    setPinLoading(true);
    try {
      const res = await fetch("/api/hostess/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (res.ok) {
        setAuthed(true);
        setPin("");
      } else {
        setPinError("Nesprávný PIN.");
      }
    } catch {
      setPinError("Chyba připojení. Zkuste to znovu.");
    } finally {
      setPinLoading(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/hostess/logout", { method: "POST" }).catch(() => {});
    setAuthed(false);
    resetVerify();
  }

  function resetVerify() {
    setCode("");
    setResult(null);
    setActionError(null);
    setRedeemedNow(null);
  }

  async function handleVerify(ev: React.FormEvent) {
    ev.preventDefault();
    if (verifyLoading || !code.trim()) return;
    setActionError(null);
    setResult(null);
    setRedeemedNow(null);
    setVerifyLoading(true);
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (res.status === 401) {
        setAuthed(false);
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setActionError("Nepodařilo se ověřit kód. Zkuste to znovu.");
        return;
      }
      setResult(data as VerifyResult);
    } catch {
      setActionError("Chyba připojení. Zkuste to znovu.");
    } finally {
      setVerifyLoading(false);
    }
  }

  async function handleRedeem() {
    if (redeemLoading || !result || result.status !== "valid") return;
    setActionError(null);
    setRedeemLoading(true);
    try {
      const res = await fetch("/api/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: result.code }),
      });
      if (res.status === 401) {
        setAuthed(false);
        return;
      }
      const data = await res.json();
      if (data.status === "redeemed") {
        setRedeemedNow(data.redeemedAt);
        setResult({ ...result, status: "already_redeemed", redeemedAt: data.redeemedAt } as VerifyResult);
        fetchStats();
      } else if (data.status === "already_redeemed") {
        // Mezitím redeemnula jiná hosteska
        setResult({ ...result, status: "already_redeemed", redeemedAt: data.redeemedAt } as VerifyResult);
        setActionError("Kód byl mezitím využit na jiném zařízení.");
      } else if (data.status === "not_found") {
        setResult({ status: "not_found" });
      } else {
        setActionError("Redeem se nezdařil. Zkuste to znovu.");
      }
    } catch {
      setActionError("Chyba připojení. Zkuste to znovu.");
    } finally {
      setRedeemLoading(false);
    }
  }

  // ----- Loading initial -----
  if (authed === null) {
    return (
      <main className="wrap">
        <div className="verify" style={{ justifyContent: "center", alignItems: "center" }}>
          <span className="spinner" style={{ borderTopColor: "var(--accent)", borderColor: "var(--field-border)" }} />
        </div>
      </main>
    );
  }

  // ----- PIN GATE -----
  if (!authed) {
    return (
      <main className="wrap">
        <div className="verify" style={{ justifyContent: "center" }}>
          <h1>Přístup pro hostesky</h1>
          <p className="verify__sub">Zadejte event PIN</p>
          <form onSubmit={handleLogin} noValidate>
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="PIN"
              autoComplete="off"
              aria-label="Event PIN"
              autoFocus
            />
            {pinError && <div className="err" role="alert" style={{ textAlign: "center", marginBottom: 10 }}>{pinError}</div>}
            <button type="submit" className="btn" disabled={pinLoading || !pin}>
              {pinLoading ? <><span className="spinner" aria-hidden="true" />Ověřuji…</> : "Přihlásit"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  // ----- VERIFY UI -----
  return (
    <main className="wrap">
      <div className="topbar">
        <button type="button" onClick={handleLogout}>Odhlásit</button>
      </div>
      <div className="verify">
        <h1>Ověřit kód</h1>
        <p className="verify__sub">Zadejte kód z obrazovky návštěvníka</p>

        {stats && (
          <div className="stats">
            <div className="stats__item">
              <span className="stats__num">{stats.redeemed}</span>
              <span className="stats__label">Využito</span>
            </div>
            <div className="stats__divider" />
            <div className="stats__item">
              <span className="stats__num">{stats.total}</span>
              <span className="stats__label">Vygenerováno</span>
            </div>
          </div>
        )}

        <form onSubmit={handleVerify} noValidate>
          <input
            ref={codeRef}
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Zadejte kód"
            autoComplete="off"
            autoCapitalize="characters"
            aria-label="Kód"
            autoFocus
          />
          <button type="submit" className="btn" disabled={verifyLoading || !code.trim()}>
            {verifyLoading ? <><span className="spinner" aria-hidden="true" />Ověřuji…</> : "Ověřit"}
          </button>
        </form>

        {actionError && <div className="form-error" role="alert" style={{ marginTop: 16 }}>{actionError}</div>}

        {result?.status === "valid" && (
          <div className="result result--ok" aria-live="polite">
            <div className="result__badge">✓ Kód je platný</div>
            <div className="result__row"><span>Jméno</span><span>{result.firstName} {result.lastName}</span></div>
            <div className="result__row"><span>E-mail</span><span>{result.email}</span></div>
            <div className="result__row"><span>Kód</span><span>{result.code}</span></div>
            <div className="result__actions">
              <button type="button" className="btn" onClick={handleRedeem} disabled={redeemLoading}>
                {redeemLoading ? <><span className="spinner" aria-hidden="true" />Označuji…</> : "Označit jako využitý"}
              </button>
              <button type="button" className="btn btn--ghost" onClick={resetVerify} disabled={redeemLoading}>
                Zadat další
              </button>
            </div>
          </div>
        )}

        {result?.status === "already_redeemed" && (
          <div className="result result--used" aria-live="polite">
            <div className="result__badge">
              {redeemedNow ? "✓ Označeno jako využité" : "Kód již byl využit"}
            </div>
            <div className="result__row"><span>Využito</span><span>{formatDateTime(result.redeemedAt)}</span></div>
            {result.firstName && <div className="result__row"><span>Jméno</span><span>{result.firstName} {result.lastName}</span></div>}
            <div className="result__actions">
              <button type="button" className="btn btn--ghost" onClick={resetVerify}>Zadat další</button>
            </div>
          </div>
        )}

        {result?.status === "not_found" && (
          <div className="result result--none" aria-live="polite">
            <div className="result__badge">Kód nenalezen</div>
            <div className="result__actions">
              <button type="button" className="btn btn--ghost" onClick={resetVerify}>Zadat další</button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
