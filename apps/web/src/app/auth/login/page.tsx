"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { Suspense } from "react";
import { api, ApiError } from "@/lib/api";
import { ChatterLogo } from "@/components/icons";

function LoginForm() {
  const router = useRouter();
  const justReset = useSearchParams().get("reset") === "1";
  const [identifier, setIdentifier] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/auth/login", { method: "POST", json: { identifier: identifier.trim(), password } });
      router.replace("/app/chats");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-subtle)", padding: 16 }}>
      <form
        onSubmit={submit}
        style={{
          width: 380,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 18,
          padding: "32px 28px",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: "linear-gradient(135deg,var(--p500),var(--p700))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ChatterLogo />
          </div>
          <div style={{ fontSize: 19, fontWeight: 800 }}>Chatter</div>
        </div>
        <div style={{ fontSize: 21, fontWeight: 800 }}>Welcome back</div>
        <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 4, marginBottom: 20 }}>Sign in to your workspace.</div>
        {justReset && (
          <div role="status" style={{ marginBottom: 16, background: "var(--muted)", border: "1px solid var(--good,#22b967)", color: "var(--text)", borderRadius: 10, padding: "9px 12px", fontSize: 12.5 }}>
            Your password has been updated successfully. Please log in with your new password.
          </div>
        )}
        <label htmlFor="identifier" style={{ display: "block", fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>
          Email / Mobile / Aadhaar
        </label>
        <input
          id="identifier"
          type="text"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
          style={inputStyle}
          autoComplete="username"
          placeholder="you@example.com, +91 98765 43210 or Aadhaar"
        />
        <label htmlFor="password" style={{ display: "block", fontSize: 12.5, fontWeight: 700, margin: "14px 0 6px" }}>Password</label>
        <div style={{ position: "relative" }}>
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ ...inputStyle, paddingRight: 54 }}
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 11.5, fontWeight: 700, color: "var(--accent-text)" }}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        {error && <div role="alert" style={{ color: "var(--bad)", fontSize: 12.5, marginTop: 10 }}>{error}</div>}
        <div style={{ textAlign: "right", marginTop: 10 }}>
          <Link href="/auth/forgot-password" style={{ fontSize: 12.5, color: "var(--accent-text)", fontWeight: 700 }}>Forgot password?</Link>
        </div>
        <button
          type="submit"
          disabled={busy}
          style={{
            width: "100%",
            marginTop: 20,
            background: "var(--p600)",
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
            borderRadius: 11,
            padding: "11px 0",
            border: "none",
            cursor: "pointer",
            opacity: busy ? 0.7 : 1,
          }}
        >
          {busy ? "Signing in…" : "Sign In"}
        </button>
        <div style={{ fontSize: 12.5, color: "var(--text2)", marginTop: 16, textAlign: "center" }}>
          No account? <Link href="/auth/register">Create one</Link>
        </div>
      </form>
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

/** useSearchParams needs a Suspense boundary for static prerendering. */
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
