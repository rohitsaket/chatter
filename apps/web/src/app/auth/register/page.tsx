"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { COUNTRIES, aadhaarDigitCount, countryByCode, formatAadhaar, statesFor } from "@chatter/validation";
import { registerBody } from "@chatter/contracts";
import { api, ApiError } from "@/lib/api";
import { ChatterLogo } from "@/components/icons";

type Form = {
  firstName: string;
  lastName: string;
  mobileNumber: string;
  email: string;
  password: string;
  country: string;
  state: string;
  pinCode: string;
  aadhaarNumber: string;
  confirmAccurate: boolean;
};

const EMPTY: Form = {
  firstName: "",
  lastName: "",
  mobileNumber: "",
  email: "",
  password: "",
  country: "IN",
  state: "",
  pinCode: "",
  aadhaarNumber: "",
  confirmAccurate: false,
};

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = React.useState<Form>(EMPTY);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [error, setError] = React.useState<string | null>(null);
  const [showAadhaar, setShowAadhaar] = React.useState(false);
  // Opaque handle to the SERVER-side verification transaction. The client
  // never asserts "verified" — the API re-checks this on registration.
  const [busy, setBusy] = React.useState(false);

  const country = countryByCode(form.country);
  const states = statesFor(form.country);
  // The Aadhaar field is masked, so a live count is the only way the user can
  // tell they typed 11 digits instead of 12.
  const aadhaarDigits = aadhaarDigitCount(form.aadhaarNumber);

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((e) => {
      if (!e[key]) return e;
      const { [key as string]: _drop, ...rest } = e;
      return rest;
    });
  }

  // Changing country invalidates a state chosen from the previous country's list.
  function setCountry(code: string) {
    setForm((f) => ({ ...f, country: code, state: "", pinCode: "" }));
    setFieldErrors({});
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Same schema the server enforces — this only saves a round trip.
    const parsed = registerBody.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!errs[key]) errs[key] = issue.message;
      }
      setFieldErrors(errs);
      setError("Please correct the highlighted fields.");
      return;
    }

    setBusy(true);
    try {
      await api("/auth/register", { method: "POST", json: parsed.data });
      // Drop sensitive values from memory as soon as they are no longer needed.
      setForm(EMPTY);
      router.replace("/app/chats");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed");
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-subtle)", padding: 16 }}>
      <form
        onSubmit={submit}
        noValidate
        style={{
          width: "100%",
          maxWidth: 520,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 18,
          padding: "32px 28px",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: "linear-gradient(135deg,var(--p500),var(--p700))", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChatterLogo />
          </div>
          <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-.02em" }}>Chatter</div>
        </div>
        <h1 style={{ fontSize: 21, fontWeight: 800, margin: "14px 0 4px" }}>Create account</h1>
        <p style={{ fontSize: 13, color: "var(--text2)", margin: "0 0 8px" }}>All fields are required.</p>

        <SectionTitle>Personal information</SectionTitle>
        <Grid2>
          <Field label="First name" error={fieldErrors.firstName} htmlFor="firstName">
            <input id="firstName" autoComplete="given-name" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} style={inputStyle(Boolean(fieldErrors.firstName))} {...fieldAria("firstName", fieldErrors.firstName)} />
          </Field>
          <Field label="Last name" error={fieldErrors.lastName} htmlFor="lastName">
            <input id="lastName" autoComplete="family-name" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} style={inputStyle(Boolean(fieldErrors.lastName))} {...fieldAria("lastName", fieldErrors.lastName)} />
          </Field>
        </Grid2>
        <Field label="Mobile number" error={fieldErrors.mobileNumber} htmlFor="mobileNumber" hint={country ? `Include or omit +${country.dial}` : undefined}>
          <input id="mobileNumber" type="tel" inputMode="tel" autoComplete="tel" value={form.mobileNumber} onChange={(e) => set("mobileNumber", e.target.value)} placeholder={form.country === "IN" ? "98765 43210" : ""} style={inputStyle(Boolean(fieldErrors.mobileNumber))} {...fieldAria("mobileNumber", fieldErrors.mobileNumber, true)} />
        </Field>
        <Field label="Email address" error={fieldErrors.email} htmlFor="email">
          <input id="email" type="email" autoComplete="email" value={form.email} onChange={(e) => set("email", e.target.value)} style={inputStyle(Boolean(fieldErrors.email))} {...fieldAria("email", fieldErrors.email)} />
        </Field>
        <Field label="Password" error={fieldErrors.password} htmlFor="password" hint="At least 10 characters, with a letter and a digit">
          <input id="password" type="password" autoComplete="new-password" value={form.password} onChange={(e) => set("password", e.target.value)} style={inputStyle(Boolean(fieldErrors.password))} {...fieldAria("password", fieldErrors.password, true)} />
        </Field>

        <SectionTitle>Location</SectionTitle>
        <Grid2>
          <Field label="Country" error={fieldErrors.country} htmlFor="country">
            <select id="country" autoComplete="country" value={form.country} onChange={(e) => setCountry(e.target.value)} style={inputStyle(Boolean(fieldErrors.country))} {...fieldAria("country", fieldErrors.country)}>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="State" error={fieldErrors.state} htmlFor="state">
            {states.length > 0 ? (
              <select id="state" autoComplete="address-level1" value={form.state} onChange={(e) => set("state", e.target.value)} style={inputStyle(Boolean(fieldErrors.state))} {...fieldAria("state", fieldErrors.state)}>
                <option value="">Select state</option>
                {states.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            ) : (
              <input id="state" autoComplete="address-level1" value={form.state} onChange={(e) => set("state", e.target.value)} style={inputStyle(Boolean(fieldErrors.state))} {...fieldAria("state", fieldErrors.state)} />
            )}
          </Field>
        </Grid2>
        <Field label="PIN code" error={fieldErrors.pinCode} htmlFor="pinCode" hint={country?.postalLabel}>
          <input id="pinCode" inputMode="numeric" autoComplete="postal-code" value={form.pinCode} onChange={(e) => set("pinCode", e.target.value)} style={inputStyle(Boolean(fieldErrors.pinCode))} {...fieldAria("pinCode", fieldErrors.pinCode, Boolean(country?.postalLabel))} />
        </Field>

        <SectionTitle>Identity</SectionTitle>
        <Field
          label="Aadhaar number"
          error={fieldErrors.aadhaarNumber}
          htmlFor="aadhaarNumber"
          hint={`${aadhaarDigits} of 12 digits entered. Stored encrypted and never shown in full again.`}
        >
          <div style={{ position: "relative" }}>
            <input
              id="aadhaarNumber"
              type={showAadhaar ? "text" : "password"}
              inputMode="numeric"
              // "off" is widely ignored on password-typed inputs; "new-password"
              // is what actually stops a manager offering to save this value.
              autoComplete="new-password"
              spellCheck={false}
              // 12 digits in 4-4-4 groups — two spaces, hence 14.
              maxLength={14}
              placeholder="1234 5678 9012"
              value={form.aadhaarNumber}
              // Drop non-digits and re-group as the user types, so the field can
              // never hold something the validator would reject on length or
              // character grounds — the mask hides such typos completely.
              onChange={(e) => set("aadhaarNumber", formatAadhaar(e.target.value))}
              style={{ ...inputStyle(Boolean(fieldErrors.aadhaarNumber)), paddingRight: 54, letterSpacing: showAadhaar ? ".08em" : undefined }}
              {...fieldAria("aadhaarNumber", fieldErrors.aadhaarNumber, true)}
            />
            <button
              type="button"
              onClick={() => setShowAadhaar((v) => !v)}
              aria-label={showAadhaar ? "Hide Aadhaar number" : "Show Aadhaar number"}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 11.5, fontWeight: 700, color: "var(--accent-text)" }}
            >
              {showAadhaar ? "Hide" : "Show"}
            </button>
          </div>
        </Field>

        <label style={{ display: "flex", gap: 9, alignItems: "flex-start", marginTop: 14, fontSize: 12.5, color: "var(--text2)", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={form.confirmAccurate}
            onChange={(e) => set("confirmAccurate", e.target.checked)}
            style={{ marginTop: 2 }}
            {...fieldAria("confirmAccurate", fieldErrors.confirmAccurate)}
          />
          <span>I confirm that the information provided is accurate.</span>
        </label>
        {fieldErrors.confirmAccurate && <ErrorText id="confirmAccurate-error">{fieldErrors.confirmAccurate}</ErrorText>}

        {error && (
          <div role="alert" style={{ marginTop: 14, background: "var(--muted)", border: "1px solid var(--bad,#ef4457)", color: "var(--bad,#ef4457)", borderRadius: 10, padding: "9px 12px", fontSize: 12.5 }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          style={{ width: "100%", marginTop: 18, background: "var(--p600)", color: "#fff", border: "none", borderRadius: 11, padding: "11px 0", font: "inherit", fontSize: 14, fontWeight: 700, cursor: busy ? "wait" : "pointer", opacity: busy ? 0.7 : 1 }}
        >
          {busy ? "Creating account…" : "Create account"}
        </button>
        <div style={{ marginTop: 14, fontSize: 12.5, color: "var(--text2)", textAlign: "center" }}>
          Already have an account?{" "}
          <Link href="/auth/login" style={{ color: "var(--accent-text)", fontWeight: 700 }}>Sign in</Link>
        </div>
      </form>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 20, paddingTop: 14, borderTop: "1px solid var(--border)", fontSize: 13, fontWeight: 800, color: "var(--text)" }}>
      {children}
    </div>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>{children}</div>;
}

/**
 * Points an input at the hint and error text `Field` renders for it. Kept
 * separate from `Field` because some fields wrap their input in a positioning
 * element, so the props cannot simply be cloned onto `children`.
 */
function fieldAria(id: string, error?: string, hasHint?: boolean) {
  const describedBy = [hasHint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ");
  return {
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy || undefined,
  };
}

function Field({ label, error, hint, htmlFor, children }: { label: string; error?: string; hint?: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 12 }}>
      <label htmlFor={htmlFor} style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>
        {label} <span style={{ color: "var(--bad,#ef4457)" }} aria-hidden="true">*</span>
      </label>
      {children}
      {/* Hint and error render together: the format guidance is needed most at
          the moment the value was rejected, so an error must not replace it. */}
      {hint ? <div id={`${htmlFor}-hint`} style={{ fontSize: 11.5, color: "var(--text3)", marginTop: 4 }}>{hint}</div> : null}
      {error ? <ErrorText id={`${htmlFor}-error`}>{error}</ErrorText> : null}
    </div>
  );
}

function ErrorText({ id, children }: { id?: string; children: React.ReactNode }) {
  return <div id={id} role="alert" style={{ fontSize: 11.5, color: "var(--bad,#ef4457)", marginTop: 4, fontWeight: 600 }}>{children}</div>;
}

function inputStyle(invalid: boolean): React.CSSProperties {
  return {
    width: "100%",
    borderRadius: 10,
    border: `1px solid ${invalid ? "var(--bad,#ef4457)" : "var(--border)"}`,
    background: "var(--muted)",
    color: "var(--text)",
    font: "inherit",
    fontSize: 13.5,
    padding: "10px 12px",
    outline: "none",
  };
}
