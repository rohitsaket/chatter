"use client";
import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, PresenceDot, presenceLabel } from "@chatter/ui";
import { api } from "@/lib/api";
import { formatBytes, relativeTime } from "@/lib/format";
import { useAdminAudit, useAdminMembers, useAdminStorage, useMe } from "@/lib/queries";

const NAV = [
  { name: "Members", icon: "👥", active: true },
  { name: "Workspaces", icon: "🗂" },
  { name: "Roles & Permissions", icon: "🛡" },
  { name: "Groups", icon: "👪" },
  { name: "Storage", icon: "💾" },
  { name: "Audit Log", icon: "📜" },
  { name: "Retention", icon: "⏳" },
  { name: "Moderation", icon: "⚖" },
];

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
  const members = useAdminMembers();
  const storage = useAdminStorage();
  const audit = useAdminAudit();
  const qc = useQueryClient();

  if (me.data && me.data.orgRole !== "OWNER" && me.data.orgRole !== "ADMIN") {
    return (
      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text2)", fontSize: 13.5, background: "var(--bg-subtle)" }}>
        Admin access requires an Admin or Owner role.
      </main>
    );
  }

  const rows = members.data ?? [];
  const st = storage.data;

  return (
    <>
      <div style={{ width: 238, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: "1px solid var(--border)", background: "var(--bg)" }}>
        <div style={{ padding: "16px 18px 10px", fontSize: 16, fontWeight: 800 }}>Administration</div>
        <div style={{ padding: "0 10px", display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV.map((an) => (
            <div
              key={an.name}
              className={an.active ? undefined : "hoverable"}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", borderRadius: 11, cursor: "pointer", fontWeight: 600, fontSize: 13.5, background: an.active ? "var(--sel)" : "transparent", color: an.active ? "var(--p600)" : "var(--text)" }}
            >
              <span style={{ opacity: 0.8 }}>{an.icon}</span>
              {an.name}
            </div>
          ))}
        </div>
      </div>
      <main style={{ flex: 1, minWidth: 0, overflowY: "auto", background: "var(--bg-subtle)", padding: "18px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>Members</div>
            <div style={{ fontSize: 12.5, color: "var(--text2)", marginTop: 3 }}>{rows.length} members</div>
          </div>
          <div className="hover-p700" style={{ background: "var(--p600)", color: "#fff", fontSize: 13, fontWeight: 700, borderRadius: 10, padding: "9px 16px", cursor: "pointer" }}>
            + Invite Members
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
                  color: am.role === "OWNER" ? "var(--warn)" : am.role === "GUEST" ? "var(--text2)" : "var(--p600)",
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
                <span className="hoverable" style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text2)", border: "1px solid var(--border)", borderRadius: 99, padding: "4px 11px", cursor: "pointer" }}>
                  Manage
                </span>
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
            <div style={{ borderTop: "1px solid var(--border)", marginTop: 12, paddingTop: 11, fontSize: 12.5, fontWeight: 700, color: "var(--p600)", cursor: "pointer" }}>
              Manage quotas ›
            </div>
          </div>
          <div style={adminCard}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 800, fontSize: 13.5 }}>Recent Audit Events</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--p600)", cursor: "pointer" }}>Open audit log</span>
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
