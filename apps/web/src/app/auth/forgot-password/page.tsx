"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { api, ApiError } from "@/lib/api";
import { ChatterLogo } from "@/components/icons";

/**
 * Three-step reset, all in one page so the challenge id, OTP and reset token
 * live only in component state — never in a URL, localStorage or sessionStorage.
 */
type Step = "identify" | "otp" | "password";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = React.useState<Step>("identify");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const [email, setEmail] = React.useState("");
  const [mobileNumber, setMobileNumber] = React.useState("");
  const [aadhaarNumber, setAadhaarNumber] = React.useState("");

  const [challengeId, setChallengeId] = React.useState("");
  const [sentTo, setSentTo] = React.useState("");
  const [otp, setOtp] = React.useState("");

  const [resetToken, setResetToken] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  const [cooldown, setCooldown] = React.useState(0);
  React.useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function submitIdentify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ challengeId: string; sentTo: string; message: string }>("/auth/password-reset/request", {
        method: "POST",
        json: { email: email.trim(), mobileNumber: mobileNumber.trim(), aadhaarNumber: aadhaarNumber.trim() },
      });
      setChallengeId(res.challengeId);
      setSentTo(res.sentTo);
      setNotice(res.message);
      // Aadhaar is no longer needed — drop it from memory immediately.
      setAadhaarNumber("");
      setStep("otp");
      setCooldown(60);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function submitOtp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ resetToken: string }>("/auth/password-reset/verify-otp", {
        method: "POST",
        json: { challengeId, otp: otp.trim() },
      });
      setResetToken(res.resetToken);
      setOtp("");
      setNotice(null);
      setStep("password");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Verification failed.");
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ sentTo: string; message: string }>("/auth/password-reset/resend", {
        method: "POST",
        json: { challengeId },
      });
      setNotice(res.message);
      setCooldown(60);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not resend the code.");
    } finally {
      setBusy(false);
    }
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/auth/password-reset/complete", {
        method: "POST",
        json: { resetToken, password, confirmPassword },
      });
      // Clear every sensitive value before leaving the page.
      setResetToken("");
      setPassword("");
      setConfirmPassword("");
      router.replace("/auth/login?reset=1");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reset the password.");
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-subtle)", padding: 16 }}>
      <form
        onSubmit={step === "identify" ? submitIdentify : step === "otp" ? submitOtp : submitPassword}
        noValidate
        style={{ width: "100%", maxWidth: 420, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, padding: "32px 28px", boxShadow: "var(--shadow-lg)" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: "linear-gradient(135deg,var(--p500),var(--p700))", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChatterLogo />
          </div>
          <div style={{ fontSize: 19, fontWeight: 800 }}>Chatter</div>
        </div>

        {step === "identify" && (
          <>
            <h1 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 4px" }}>Forgot password</h1>
            <p style={{ fontSize: 13, color: "var(--text2)", margin: "0 0 6px" }}>
              Enter your registered account details. All three must match the same account.
            </p>
            <Field label="Email address" htmlFor="email">
              <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Mobile number" htmlFor="mobile">
              <input id="mobile" type="tel" inputMode="tel" autoComplete="tel" value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Aadhaar number" htmlFor="aadhaar">
              <input id="aadhaar" type="password" inputMode="numeric" autoComplete="off" value={aadhaarNumber} onChange={(e) => setAadhaarNumber(e.target.value)} style={inputStyle} />
            </Field>
          </>
        )}

        {step === "otp" && (
          <>
            <h1 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 4px" }}>Verify your email</h1>
            <p style={{ fontSize: 13, color: "var(--text2)", margin: "0 0 6px" }}>
              If those details match an account, we sent a 6-digit code to <b>{sentTo}</b>.
            </p>
            <Field label="Verification code" htmlFor="otp">
              <input
                id="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                style={{ ...inputStyle, letterSpacing: 6, fontSize: 18, textAlign: "center", fontWeight: 700 }}
              />
            </Field>
            <div style={{ marginTop: 10, fontSize: 12.5 }}>
              <button
                type="button"
                onClick={resend}
                disabled={busy || cooldown > 0}
                style={{ background: "none", border: "none", padding: 0, cursor: cooldown > 0 ? "not-allowed" : "pointer", color: cooldown > 0 ? "var(--text3)" : "var(--accent-text)", fontWeight: 700, font: "inherit" }}
              >
                {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
              </button>
            </div>
          </>
        )}

        {step === "password" && (
          <>
            <h1 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 4px" }}>Create new password</h1>
            <p style={{ fontSize: 13, color: "var(--text2)", margin: "0 0 6px" }}>At least 10 characters, with a letter and a digit.</p>
            <Field label="New password" htmlFor="new-password">
              <input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Confirm new password" htmlFor="confirm-password">
              <input id="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={inputStyle} />
            </Field>
          </>
        )}

        {notice && !error && (
          <div style={{ marginTop: 14, background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 10, padding: "9px 12px", fontSize: 12.5, color: "var(--text2)" }}>
            {notice}
          </div>
        )}
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
          {busy ? "Please wait…" : step === "identify" ? "Continue" : step === "otp" ? "Verify code" : "Reset password"}
        </button>

        <div style={{ marginTop: 14, fontSize: 12.5, color: "var(--text2)", textAlign: "center" }}>
          <Link href="/auth/login" style={{ color: "var(--accent-text)", fontWeight: 700 }}>Back to sign in</Link>
        </div>
      </form>
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 12 }}>
      <label htmlFor={htmlFor} style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid var(--border)",
  borderRadius: 11,
  padding: "10px 12px",
  fontSize: 13.5,
  background: "var(--bg)",
  color: "var(--text)",
  outline: "none",
};
