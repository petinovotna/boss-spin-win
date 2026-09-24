"use client";

import { useEffect, useRef, useState } from "react";
import { content } from "@/config/content";

type FieldErrors = { firstName?: string; lastName?: string; email?: string; segment?: string; consent?: string };
const STORAGE_KEY = "boss_spin_win_code";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Hero() {
  return (
    <div
      className="hero"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(12,11,10,0) 38%, rgba(12,11,10,0.6) 100%), url(${content.hero})`,
      }}
    >
      <div className="hero__logo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={content.logo} alt="BOSS" />
      </div>
      <div className="hero__fade" aria-hidden="true" />
    </div>
  );
}

export default function Page() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [segment, setSegment] = useState("");
  const [consent, setConsent] = useState(false);
  const [marketing, setMarketing] = useState(false);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const firstNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  // Po refreshi success obrazovky znovu ukaž kód (edge case: refresh success page)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) setCode(saved);
    } catch {
      /* ignore */
    }
  }, []);

  function validate(): boolean {
    const e: FieldErrors = {};
    if (!firstName.trim()) e.firstName = "Vyplňte prosím jméno.";
    if (!lastName.trim()) e.lastName = "Vyplňte prosím příjmení.";
    if (!EMAIL_RE.test(email.trim())) e.email = "Zadejte platný e-mail.";
    if (!segment) e.segment = "Vyberte prosím možnost.";
    if (!consent) e.consent = "Pro účast je souhlas nutný.";
    setErrors(e);

    // Focus management: skoč na první chybné pole
    if (e.firstName) firstNameRef.current?.focus();
    else if (e.email && !e.firstName && !e.lastName) emailRef.current?.focus();
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setFormError(null);
    if (submitting) return; // ochrana proti double-submitu
    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          segment,
          consent,
          marketingConsent: marketing,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.code) {
        try {
          sessionStorage.setItem(STORAGE_KEY, data.code);
        } catch {
          /* ignore */
        }
        setCode(data.code);
        window.scrollTo(0, 0);
        return;
      }

      if (res.status === 409 || data.error === "already_registered") {
        setFormError(content.alreadyRegistered);
      } else if (data.error === "invalid_email") {
        setErrors((p) => ({ ...p, email: "Zadejte platný e-mail." }));
      } else if (data.error === "missing_segment") {
        setErrors((p) => ({ ...p, segment: "Vyberte prosím možnost." }));
      } else if (data.error === "consent_required") {
        setErrors((p) => ({ ...p, consent: "Pro účast je souhlas nutný." }));
      } else {
        setFormError(content.genericError);
      }
    } catch {
      setFormError(content.networkError);
    } finally {
      setSubmitting(false);
    }
  }

  async function copyCode() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard nedostupný — uživatel kód opíše ručně */
    }
  }

  // ---------- SUCCESS SCREEN ----------
  if (code) {
    return (
      <main className="wrap">
        <Hero />

        <section className="success" aria-live="polite">
          <div className="success__title">{content.successTitle}</div>
          <div className="code-box">{code}</div>
          <p className="success__hint">{content.successHint}</p>
          <button type="button" className="btn" onClick={copyCode}>
            {copied ? content.copiedLabel : content.copyLabel}
          </button>
        </section>

        <div className="footer">{content.footer}</div>
      </main>
    );
  }

  // ---------- REGISTRATION FORM ----------
  return (
    <main className="wrap">
      <div
        className="hero"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(20,17,12,0) 45%, rgba(20,17,12,0.92) 100%), url(${content.hero})`,
        }}
      >
        <div className="hero__logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={content.logo} alt="BOSS" />
        </div>
      </div>

      <div className="intro">
        <h1>{content.headline}</h1>
        <p>{content.intro}</p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {formError && (
          <div className="form-error" role="alert">
            {formError}
          </div>
        )}

        <div className={`field${errors.firstName ? " field--invalid" : ""}`}>
          <label htmlFor="firstName">
            Jméno <span className="req">*</span>
          </label>
          <input
            id="firstName"
            ref={firstNameRef}
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Jan"
            autoComplete="given-name"
            aria-invalid={!!errors.firstName}
            disabled={submitting}
          />
          {errors.firstName && <div className="err">{errors.firstName}</div>}
        </div>

        <div className={`field${errors.lastName ? " field--invalid" : ""}`}>
          <label htmlFor="lastName">
            Příjmení <span className="req">*</span>
          </label>
          <input
            id="lastName"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Novák"
            autoComplete="family-name"
            aria-invalid={!!errors.lastName}
            disabled={submitting}
          />
          {errors.lastName && <div className="err">{errors.lastName}</div>}
        </div>

        <div className={`field${errors.email ? " field--invalid" : ""}`}>
          <label htmlFor="email">
            E-mail <span className="req">*</span>
          </label>
          <input
            id="email"
            ref={emailRef}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jan.novak@email.cz"
            autoComplete="email"
            inputMode="email"
            aria-invalid={!!errors.email}
            disabled={submitting}
          />
          {errors.email && <div className="err">{errors.email}</div>}
        </div>

        <div className={`field${errors.segment ? " field--invalid" : ""}`}>
          <label htmlFor="segment">
            {content.segmentLabel} <span className="req">*</span>
          </label>
          <select
            id="segment"
            className={segment ? "" : "placeholder"}
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
            aria-invalid={!!errors.segment}
            disabled={submitting}
          >
            <option value="" disabled>
              {content.segmentPlaceholder}
            </option>
            {content.segmentOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          {errors.segment && <div className="err">{errors.segment}</div>}
        </div>

        <div className={`consent${errors.consent ? " field--invalid" : ""}`}>
          <input
            id="consent"
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            aria-invalid={!!errors.consent}
            disabled={submitting}
          />
          <label htmlFor="consent">
            {content.consentLabel}{" "}
            <a href={content.privacyUrl} target="_blank" rel="noopener noreferrer">
              {content.consentLinkText}
            </a>
            . <span className="req">*</span>
            {errors.consent && <div className="err">{errors.consent}</div>}
          </label>
        </div>

        <div className="consent">
          <input
            id="marketing"
            type="checkbox"
            checked={marketing}
            onChange={(e) => setMarketing(e.target.checked)}
            disabled={submitting}
          />
          <label htmlFor="marketing">{content.marketingLabel}</label>
        </div>

        <button type="submit" className="btn" disabled={submitting}>
          {submitting ? (
            <>
              <span className="spinner" aria-hidden="true" />
              Odesílám…
            </>
          ) : (
            "Zatočit a získat kód"
          )}
        </button>
      </form>

      <div className="footer">{content.footer}</div>
    </main>
  );
}
