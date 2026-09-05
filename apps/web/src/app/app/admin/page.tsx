"use client";
import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, PresenceDot, presenceLabel } from "@chatter/ui";
import { api } from "@/lib/api";
import { formatBytes, relativeTime } from "@/lib/format";
import { useAdminAudit, useAdminMembers, useAdminStorage, useMe } from "@/lib/queries";
import { DotsMenu } from "@/components/common/Menu";

const NAV = [
  { name: "Members", icon: "👥" },
  { name: "Storage", icon: "💾" },
  { name: "Audit Log", icon: "📜" },
  { name: "Workspaces", icon: "🗂" },
  { name: "Roles & Permissions", icon: "🛡" },
  { name: "Groups", icon: "👪" },
  { name: "Retention", icon: "⏳" },
  { name: "Moderation", icon: "⚖" },
];

/** Sections with a real backend today. The rest show a truthful empty state. */
const BUILT = new Set(["Members", "Storage", "Audit Log"]);

const AUDIT_ICONS: Record<string, string> = {
  "security.mfa_enabled": "🔑",
  "member.invited": "👥",
  "file.shared_externally": "📄",
  "member.role_changed": "🛡",
  "member.suspended": "🚫",
  "member.unsuspended": "✅",
  "retention.statuses_expired": "🗑",
  "auth.registered": "👤",
};

const GRID = "2fr 1.2fr 1fr 1fr 130px";

export default function AdminPage() {
  const me = useMe();
  // All three endpoints are admin-only. Hooks must run unconditionally, so the
  // requests are gated with `enabled` instead — otherwise a member landing here
  // fires six calls that can only 403.
  const isAdmin = me.data?.orgRole === "OWNER" || me.data?.orgRole === "ADMIN";
  const members = useAdminMembers(isAdmin);
  const storage = useAdminStorage(isAdmin);
  const audit = useAdminAudit(isAdmin);
  const qc = useQueryClient();
  const [section, setSection] = React.useState("Members");
  const [inviteCopied, setInviteCopied] = React.useState(false);

  if (me.data && me.data.orgRole !== "OWNER" && me.data.orgRole !== "ADMIN") {
    return (
      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text2)", fontSize: 13.5, background: "var(--bg-subtle)" }}>
        Admin access requires an Admin or Owner role.
      </main>
    );
  }

  const rows = members.data ?? [];
  const st = storage.data;

  const storageCard = (
    <div style={adminCard}>
      <div style={{ fontWeight: 800, fontSize: 13.5 }}>Storage</div>
      {st && (
        <>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 10 }}>
            {formatBytes(st.usedBytes)} <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text2)" }}>of {formatBytes(st.quotaBytes)}</span>
          </div>
          <div style={{ height: 8, borderRadius: 99, background: "var(--muted)", overflow: "hidden", marginTop: 10 }}>
            <div style={{ width: `${Math.min(100, (st.usedBytes / st.quotaBytes) * 100)}%`, height: "100%", background: "var(--p600)", borderRadius: 99 }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text2)", marginTop: 10 }}>
            <span>Files {formatBytes(st.byCategory.files)}</span>
            <span>Media {formatBytes(st.byCategory.media)}</span>
            <span>Other {formatBytes(st.byCategory.other)}</span>
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      <div style={{ width: 238, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: "1px solid var(--border)", background: "var(--bg)" }}>
        <div style={{ padding: "16px 18px 10px", fontSize: 16, fontWeight: 800 }}>Administration</div>
        <div style={{ padding: "0 10px", display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV.map((an) => {
            const active = section === an.name;
            return (
              <div
                key={an.name}
                className={active ? undefined : "hoverable"}
                onClick={() => setSection(an.name)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", borderRadius: 11, cursor: "pointer", fontWeight: 600, fontSize: 13.5, background: active ? "var(--sel)" : "transparent", color: active ? "var(--accent-text)" : "var(--text)" }}
              >
                <span style={{ opacity: 0.8 }}>{an.icon}</span>
                {an.name}
              </div>
            );
          })}
        </div>
      </div>
      <main style={{ flex: 1, minWidth: 0, overflowY: "auto", background: "var(--bg-subtle)", padding: "18px 24px" }}>
        {!BUILT.has(section) ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 8, color: "var(--text2)" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text)" }}>{section}</div>
            <div style={{ fontSize: 13, textAlign: "center", maxWidth: 380, lineHeight: 1.6 }}>
              This administration area has no backend in the current build. Members, Storage and the Audit Log are fully functional.
            </div>
          </div>
        ) : section === "Storage" ? (
          <>
            <div style={{ fontSize: 20, fontWeight: 800 }}>Storage</div>
            <div style={{ maxWidth: 460, marginTop: 16 }}>{storageCard}</div>
          </>
        ) : section === "Audit Log" ? (
          <>
            <div style={{ fontSize: 20, fontWeight: 800 }}>Audit Log</div>
            <div style={{ ...adminCard, marginTop: 16 }}>
              {(audit.data ?? []).map((ae) => (
                <div key={ae.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 12.5 }}>
                  <span style={{ width: 28, height: 28, borderRadius: 8, background: "var(--muted)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {AUDIT_ICONS[ae.action] ?? "📌"}
                  </span>
                  <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {ae.actorName ? `${ae.actorName} — ` : ""}
                    {ae.action.replace(/[._]/g, " ")}
                    {ae.target ? ` (${ae.target.slice(0, 40)})` : ""}
                  </span>
                  <span style={{ color: "var(--text3)", fontSize: 11, flexShrink: 0 }}>{relativeTime(ae.createdAt)}</span>
                </div>
              ))}
              {(audit.data ?? []).length === 0 && <div style={{ fontSize: 12.5, color: "var(--text3)", padding: 8 }}>No audit events.</div>}
            </div>
          </>
        ) : (
          <>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>Members</div>
            <div style={{ fontSize: 12.5, color: "var(--text2)", marginTop: 3 }}>{rows.length} members</div>
          </div>
          <div
            className="hover-p700"
            onClick={() => {
              void navigator.clipboard.writeText(`${window.location.origin}/auth/register`).catch(() => void 0);
              setInviteCopied(true);
              setTimeout(() => setInviteCopied(false), 1600);
            }}
            style={{ background: "var(--p600)", color: "#fff", fontSize: 13, fontWeight: 700, borderRadius: 10, padding: "9px 16px", cursor: "pointer" }}
          >
            {inviteCopied ? "Invite link copied ✓" : "+ Invite Members"}
          </div>
        </div>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 15, marginTop: 16, boxShadow: "var(--shadow)", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: GRID, gap: 8, padding: "10px 18px", borderBottom: "1px solid var(--border)", fontSize: 12, fontWeight: 700, color: "var(--text2)", background: "var(--bg-subtle)" }}>
            <span>Member</span>
            <span>Role</span>
            <span>Status</span>
            <span>Last active</span>
            <span style={{ textAlign: "right" }}>Actions</span>
          </div>
          {rows.map((am) => (
            <div key={am.userId} style={{ display: "grid", gridTemplateColumns: GRID, gap: 8, alignItems: "center", padding: "10px 18px", borderBottom: "1px solid var(--border)", fontSize: 13, opacity: am.suspended ? 0.55 : 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <Avatar name={am.name} color={am.avatarColor} size={34} fontSize={11}>
                  {am.initials}
                </Avatar>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{am.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{am.email}</div>
                </div>
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: am.role === "OWNER" ? "var(--warn)" : am.role === "GUEST" ? "var(--text2)" : "var(--accent-text)",
                  background: am.role === "OWNER" ? "#fdf3e0" : am.role === "GUEST" ? "var(--muted)" : "var(--p100)",
                  borderRadius: 99,
                  padding: "3px 10px",
                  justifySelf: "start",
                }}
              >
                {am.role.charAt(0) + am.role.slice(1).toLowerCase()}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text2)", fontSize: 12.5 }}>
                <PresenceDot presence={am.presence} />
                {am.suspended ? "Suspended" : presenceLabel(am.presence)}
              </span>
              <span style={{ color: "var(--text2)", fontSize: 12.5 }}>{am.lastActiveAt ? relativeTime(am.lastActiveAt) : "—"}</span>
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                {am.role !== "OWNER" && (
                  <DotsMenu
                    size={0}
                    trigger={
                      <span className="hoverable" style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text2)", border: "1px solid var(--border)", borderRadius: 99, padding: "4px 11px", cursor: "pointer", display: "inline-block" }}>
                        Manage
                      </span>
                    }
                    triggerStyle={{ width: "auto", height: "auto", display: "block" }}
                    items={(["ADMIN", "MODERATOR", "MEMBER", "GUEST"] as const)
                      .filter((r) => r !== am.role)
                      .map((r) => ({
                        label: `Make ${r.charAt(0) + r.slice(1).toLowerCase()}`,
                        onClick: () =>
                          void api(`/admin/members/${am.userId}/role`, { method: "POST", json: { role: r } }).then(() =>
                            qc.invalidateQueries({ queryKey: ["admin-members"] }),
                          ),
                      }))}
                  />
                )}
                {am.role !== "OWNER" && (
                  <span
                    onClick={() =>
                      api(`/admin/members/${am.userId}/suspend`, { method: "POST", json: { suspended: !am.suspended } }).then(() =>
                        qc.invalidateQueries({ queryKey: ["admin-members"] }),
                      )
                    }
                    style={{ fontSize: 11.5, fontWeight: 700, color: "var(--bad)", border: "1px solid var(--border)", borderRadius: 99, padding: "4px 11px", cursor: "pointer" }}
                  >
                    {am.suspended ? "Restore" : "Suspend"}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 14, marginTop: 14 }}>
          {storageCard}
          <div style={adminCard}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 800, fontSize: 13.5 }}>Recent Audit Events</span>
              <span onClick={() => setSection("Audit Log")} style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-text)", cursor: "pointer" }}>Open audit log</span>
            </div>
            {(audit.data ?? []).slice(0, 5).map((ae) => (
              <div key={ae.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 12.5 }}>
                <span style={{ width: 28, height: 28, borderRadius: 8, background: "var(--muted)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {AUDIT_ICONS[ae.action] ?? "📌"}
                </span>
                <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {ae.actorName ? `${ae.actorName} — ` : ""}
                  {ae.action.replace(/[._]/g, " ")}
                  {ae.target ? ` (${ae.target.slice(0, 30)})` : ""}
                </span>
                <span style={{ color: "var(--text3)", fontSize: 11, flexShrink: 0 }}>{relativeTime(ae.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
          </>
        )}
      </main>
    </>
  );
}

const adminCard: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 15,
  padding: 16,
  boxShadow: "var(--shadow)",
};
