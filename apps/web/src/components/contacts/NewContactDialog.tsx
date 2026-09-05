"use client";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { PhoneLookupResult } from "@chatter/contracts";
import { COUNTRIES, normalizeMobile } from "@chatter/validation";
import { Avatar, PresenceDot, presenceLabel } from "@chatter/ui";
import { api, ApiError } from "@/lib/api";
import { useJoinCall } from "@/lib/queries";
import { ChatIcon, CloseIcon, PhoneIcon } from "../icons";

/**
 * Find a Chatter account by the mobile number it registered with.
 *
 * The server is the authority for existence, discoverability and block status —
 * everything here is presentation. `normalizeMobile` runs client-side only to
 * reject obviously malformed input before spending a rate-limited request.
 */
type Phase =
  | { k: "idle" }
  | { k: "searching" }
  | { k: "result"; result: PhoneLookupResult }
  | { k: "error"; message: string };

export function NewContactDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const qc = useQueryClient();
  const join = useJoinCall();
  const [country, setCountry] = React.useState("IN");
  const [phone, setPhone] = React.useState("");
  const [phase, setPhase] = React.useState<Phase>({ k: "idle" });
  const [invalid, setInvalid] = React.useState<string | null>(null);
  const [busyAction, setBusyAction] = React.useState(false);

  const dial = COUNTRIES.find((c) => c.code === country)?.dial ?? "91";

  // Changing the number invalidates whatever was on screen — never leave a
  // stale result sitting under a number it does not belong to.
  function setNumber(v: string) {
    setPhone(v);
    setInvalid(null);
    setPhase((p) => (p.k === "idle" ? p : { k: "idle" }));
  }

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (phase.k === "searching") return;

    if (!normalizeMobile(phone, country)) {
      setInvalid("Enter a valid mobile number.");
      setPhase({ k: "idle" });
      return;
    }
    setInvalid(null);
    setPhase({ k: "searching" });
    try {
      const result = await api<PhoneLookupResult>("/users/lookup", {
        method: "POST",
        json: { phone, country },
      });
      setPhase({ k: "result", result });
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setPhase({ k: "error", message: "Too many searches. Please wait and try again." });
      } else if (err instanceof ApiError && err.status === 400) {
        setInvalid("Enter a valid mobile number.");
        setPhase({ k: "idle" });
      } else {
        setPhase({ k: "error", message: "Unable to search right now. Please try again." });
      }
    }
  }

  async function openChat(userId: string) {
    setBusyAction(true);
    try {
      const conv = await api<{ slug: string | null; id: string }>("/conversations/dm", {
        method: "POST",
        json: { userId },
      });
      void qc.invalidateQueries({ queryKey: ["conversations"] });
      onClose();
      router.push(`/app/chats/${conv.slug ?? conv.id}`);
    } catch {
      setPhase({ k: "error", message: "Could not open that chat. Please try again." });
      setBusyAction(false);
    }
  }

  async function startCall(userId: string) {
    setBusyAction(true);
    try {
      const conv = await api<{ slug: string | null; id: string }>("/conversations/dm", {
        method: "POST",
        json: { userId },
      });
      const res = await join.mutateAsync(conv.slug ?? conv.id);
      if (!res.configured) {
        setPhase({ k: "error", message: res.reason ?? "Calls are not configured on this server." });
        setBusyAction(false);
        return;
      }
      onClose();
      router.push("/app/calls");
    } catch {
      setPhase({ k: "error", message: "Could not start that call. Please try again." });
      setBusyAction(false);
    }
  }

  const searching = phase.k === "searching";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-contact-title"
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(15,17,24,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 60 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 430, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px 22px 18px", boxShadow: "var(--shadow-lg)" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <h2 id="new-contact-title" style={{ margin: 0, fontSize: 16.5, fontWeight: 800 }}>New contact</h2>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text2)", display: "flex", padding: 2 }}>
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={search} noValidate>
          <label htmlFor="nc-phone" style={{ display: "block", fontSize: 12.5, fontWeight: 600, margin: "14px 0 5px" }}>
            Search by mobile number
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <select
              aria-label="Country dialling code"
              value={country}
              onChange={(e) => { setCountry(e.target.value); setPhase({ k: "idle" }); setInvalid(null); }}
              style={{ ...inputStyle(false), width: 104, flexShrink: 0 }}
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.code} +{c.dial}</option>
              ))}
            </select>
            <input
              id="nc-phone"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              placeholder={country === "IN" ? "98765 43210" : "Mobile number"}
              value={phone}
              onChange={(e) => setNumber(e.target.value)}
              style={{ ...inputStyle(Boolean(invalid)), flex: 1 }}
              aria-invalid={invalid ? true : undefined}
              aria-describedby={invalid ? "nc-phone-error" : undefined}
            />
          </div>
          {invalid && (
            <div id="nc-phone-error" role="alert" style={{ fontSize: 11.5, color: "var(--bad,#ef4457)", marginTop: 5, fontWeight: 600 }}>
              {invalid}
            </div>
          )}
          <button
            type="submit"
            disabled={searching}
            style={{ width: "100%", marginTop: 12, background: "var(--p600)", color: "#fff", border: "none", borderRadius: 11, padding: "10px 0", font: "inherit", fontSize: 13.5, fontWeight: 700, cursor: searching ? "wait" : "pointer", opacity: searching ? 0.7 : 1 }}
          >
            {searching ? "Searching…" : "Search"}
          </button>
        </form>

        {phase.k === "error" && (
          <div role="alert" style={{ marginTop: 14, background: "var(--muted)", border: "1px solid var(--bad,#ef4457)", color: "var(--bad,#ef4457)", borderRadius: 10, padding: "9px 12px", fontSize: 12.5 }}>
            {phase.message}
          </div>
        )}

        {phase.k === "result" && !phase.result.found && <NotRegistered dial={dial} phone={phone} />}

        {phase.k === "result" && phase.result.found && phase.result.user && (
          <Found
            result={phase.result}
            busy={busyAction}
            onChat={() => void openChat(phase.result.user!.id)}
            onCall={() => void startCall(phase.result.user!.id)}
            onProfile={() => { onClose(); router.push("/app/profile"); }}
          />
        )}
      </div>
    </div>
  );
}

function Found({
  result,
  busy,
  onChat,
  onCall,
  onProfile,
}: {
  result: PhoneLookupResult;
  busy: boolean;
  onChat: () => void;
  onCall: () => void;
  onProfile: () => void;
}) {
  const u = result.user!;
  const [infoOpen, setInfoOpen] = React.useState(false);

  return (
    <div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 16, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <Avatar name={u.displayName} color={u.avatarColor} size={72} fontSize={24} />
      <div style={{ fontSize: 16, fontWeight: 800, marginTop: 10 }}>{u.displayName}</div>
      {u.title && <div style={{ fontSize: 12.5, color: "var(--text2)", marginTop: 2 }}>{u.title}</div>}

      {result.self ? (
        <>
          <div style={{ fontSize: 12.5, color: "var(--text2)", marginTop: 8 }}>This is your Chatter account.</div>
          <button type="button" onClick={onProfile} style={secondaryBtn}>View profile</button>
        </>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 12.5, color: "var(--text2)" }}>
            <PresenceDot presence={u.presence} />
            {presenceLabel(u.presence)} · On Chatter
          </div>

          {result.canContact === false ? (
            // Which side blocked whom is deliberately not revealed.
            <div role="alert" style={{ marginTop: 12, fontSize: 12.5, color: "var(--text2)", textAlign: "center" }}>
              You can&apos;t contact this user.
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, width: "100%", marginTop: 14 }}>
                <ActionButton label="Chat" icon={<ChatIcon size={16} strokeWidth={1.7} />} onClick={onChat} disabled={busy} />
                <ActionButton label="Call" icon={<PhoneIcon size={15} strokeWidth={1.7} />} onClick={onCall} disabled={busy} />
                <ActionButton label="Info" icon={<span style={{ fontSize: 15, fontWeight: 800 }}>i</span>} onClick={() => setInfoOpen((v) => !v)} disabled={false} />
              </div>
              {result.relationship?.conversationExists && (
                <div style={{ fontSize: 11.5, color: "var(--text3)", marginTop: 8 }}>You already have a chat with them.</div>
              )}
            </>
          )}

          {infoOpen && (
            <div style={{ width: "100%", marginTop: 14, background: "var(--muted)", borderRadius: 12, padding: "12px 14px" }}>
              <InfoRow k="Name" v={u.displayName} />
              <InfoRow k="Role" v={u.title ?? "—"} />
              <InfoRow k="About" v={u.about ?? "—"} />
              <InfoRow k="Member since" v={new Date(u.memberSince).toLocaleDateString()} />
              <InfoRow k="In your contacts" v={result.relationship?.contactExists ? "Yes" : "No"} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * The number is not reachable on Chatter. The copy is identical whether the
 * account is absent, undiscoverable or outside the organization, matching the
 * single `{ found: false }` the API returns.
 */
function NotRegistered({ dial, phone }: { dial: string; phone: string }) {
  const [copied, setCopied] = React.useState(false);
  const link = typeof window === "undefined" ? "" : `${window.location.origin}/auth/register`;

  async function invite() {
    const text = `Join me on Chatter: ${link}`;
    try {
      const nav = navigator as Navigator & { share?: (d: { text: string }) => Promise<void> };
      if (nav.share) {
        await nav.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* user dismissed the share sheet, or the clipboard was refused */
    }
  }

  return (
    <div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 18, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
      <div style={{ width: 54, height: 54, borderRadius: "50%", background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text3)", fontSize: 24 }}>
        ?
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 12 }}>This number is not registered on Chatter.</div>
      <div style={{ fontSize: 12.5, color: "var(--text2)", marginTop: 6, lineHeight: 1.5, maxWidth: 320 }}>
        They need a Chatter account before you can chat or call them.
      </div>
      <div style={{ fontSize: 11.5, color: "var(--text3)", marginTop: 8 }}>+{dial} {phone}</div>
      <button type="button" onClick={() => void invite()} style={secondaryBtn}>
        {copied ? "Invite link copied" : "Invite to Chatter"}
      </button>
    </div>
  );
}

function ActionButton({ label, icon, onClick, disabled }: { label: string; icon: React.ReactNode; onClick: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={disabled ? undefined : "hoverable-sel"}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: "var(--muted)", borderRadius: 12, padding: "11px 4px", cursor: disabled ? "wait" : "pointer", color: "var(--accent-text)", border: "none", font: "inherit", opacity: disabled ? 0.6 : 1 }}
    >
      {icon}
      <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--text2)" }}>{label}</span>
    </button>
  );
}

function InfoRow({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", gap: 10, fontSize: 12.5, padding: "3px 0" }}>
      <span style={{ color: "var(--text3)", width: 104, flexShrink: 0 }}>{k}</span>
      <span style={{ color: "var(--text)", minWidth: 0, wordBreak: "break-word" }}>{v}</span>
    </div>
  );
}

const secondaryBtn: React.CSSProperties = {
  marginTop: 14,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text)",
  borderRadius: 10,
  padding: "9px 16px",
  font: "inherit",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

function inputStyle(invalid: boolean): React.CSSProperties {
  return {
    borderRadius: 10,
    border: `1px solid ${invalid ? "var(--bad,#ef4457)" : "var(--border)"}`,
    background: "var(--muted)",
    color: "var(--text)",
    font: "inherit",
    fontSize: 13.5,
    padding: "9px 11px",
    outline: "none",
  };
}
