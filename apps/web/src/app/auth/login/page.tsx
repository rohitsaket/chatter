"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { api, ApiError } from "@/lib/api";
import { ChatterLogo } from "@/components/icons";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("john.doe@acmecorp.com");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/auth/login", { method: "POST", json: { email, password } });
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
          boxShadow: "0 10px 40px -12px rgba(23,21,37,.15)",
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
        <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={inputStyle}
          autoComplete="email"
        />
        <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, margin: "14px 0 6px" }}>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={inputStyle}
          autoComplete="current-password"
          placeholder="Seed demo password: Chatter!Demo1"
        />
        {error && <div style={{ color: "var(--bad)", fontSize: 12.5, marginTop: 10 }}>{error}</div>}
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
