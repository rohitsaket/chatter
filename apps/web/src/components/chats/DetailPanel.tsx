"use client";
import { useRouter } from "next/navigation";
import * as React from "react";
import type { ConversationDto } from "@chatter/contracts";
import { Avatar, PresenceDot, presenceLabel } from "@chatter/ui";
import { useFiles } from "@/lib/queries";
import { useUiStore } from "@/lib/store";
import { formatBytes, listTime } from "@/lib/format";
import { CloseIcon, DotsHIcon, LeaveIcon, PhoneIcon, SearchIcon, VideoIcon } from "../icons";

export function DetailPanel({ conv, selfName }: { conv: ConversationDto; selfName: string }) {
  const router = useRouter();
  const { setDetailOpen } = useUiStore();
  const files = useFiles();
  const isGroup = conv.kind === "GROUP";
  const sharedFiles = (files.data ?? []).filter((f) => !isGroup || f.sharedIn === conv.name).slice(0, 3);
  const members = conv.participants ?? [];

  return (
    <aside style={{ width: 308, flexShrink: 0, borderLeft: "1px solid var(--border)", background: "var(--bg)", overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px 6px" }}>
        <div style={{ fontSize: 15.5, fontWeight: 800 }}>{isGroup ? "Group Info" : "Conversation Info"}</div>
        <span onClick={() => setDetailOpen(false)} style={{ cursor: "pointer", color: "var(--text2)", display: "flex" }}>
          <CloseIcon />
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 18px 4px" }}>
        <Avatar name={conv.name} color={conv.avatarColor} size={96} fontSize={30} online={conv.online} border="4px solid var(--p100)">
          {conv.icon}
        </Avatar>
        <div style={{ fontSize: 18, fontWeight: 800, marginTop: 12, display: "flex", alignItems: "center", gap: 6 }}>
          {conv.name} {conv.favorite && <span style={{ color: "#f3a622", fontSize: 15 }}>★</span>}
        </div>
        <div style={{ fontSize: 12.5, color: "var(--text2)", marginTop: 3, display: "flex", alignItems: "center", gap: 6 }}>
          {conv.online && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--good)", display: "inline-block" }} />}
          {conv.subtitle}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, width: "100%", marginTop: 16 }}>
          {[
            { label: "Audio", icon: <PhoneIcon size={17} strokeWidth={1.7} /> },
            { label: "Video", icon: <VideoIcon />, onClick: () => router.push("/app/calls") },
            { label: "Search", icon: <SearchIcon size={17} /> },
            { label: "More", icon: <DotsHIcon /> },
          ].map((a) => (
            <div
              key={a.label}
              className="hoverable-sel"
              onClick={a.onClick}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: "var(--muted)", borderRadius: 12, padding: "11px 4px", cursor: "pointer", color: "var(--p600)" }}
            >
              {a.icon}
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text2)" }}>{a.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13.5, fontWeight: 800 }}>About</span>
        </div>
        <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6, marginTop: 7 }}>{conv.about ?? "—"}</div>
      </div>

      {isGroup ? (
        <>
          <div style={{ padding: "10px 18px", borderBottom: "1px solid var(--border)" }}>
            {[
              ["Members", `${members.length}`],
              ["Online now", `${members.filter((m) => m.presence === "ONLINE").length}`],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 13 }}>
                <span style={{ color: "var(--text2)" }}>{k}</span>
                <span style={{ fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 13.5, fontWeight: 800 }}>Members ({members.length})</span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--p600)", cursor: "pointer" }}>+ Add Member</span>
            </div>
            {members.slice(0, 4).map((gm) => (
              <div key={gm.userId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
                <Avatar name={gm.name} color={gm.avatarColor} size={34} fontSize={11} presenceDot={gm.presence === "ONLINE" ? "var(--good)" : gm.presence === "AWAY" ? "var(--warn)" : "var(--border2)"}>
                  {gm.initials}
                </Avatar>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{gm.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text2)" }}>{presenceLabel(gm.presence)}</div>
                </div>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--p600)", background: "var(--p100)", borderRadius: 99, padding: "3px 9px" }}>
                  {gm.role === "OWNER" || gm.role === "ADMIN" ? "Admin" : gm.role === "MODERATOR" ? "Moderator" : "Member"}
                </span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, fontSize: 13, fontWeight: 600, color: "var(--text2)", cursor: "pointer" }}>
              View all members <span style={{ color: "var(--text3)" }}>›</span>
            </div>
          </div>
          <div style={{ padding: "8px 18px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--bad)", fontSize: 13.5, fontWeight: 700, cursor: "pointer", padding: "12px 0 2px" }}>
              <LeaveIcon /> Leave Group
            </div>
          </div>
        </>
      ) : (
        <>
          <div style={{ padding: "14px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13.5, fontWeight: 800 }}>Shared Files</span>
              <span onClick={() => router.push("/app/files")} style={{ fontSize: 12.5, fontWeight: 700, color: "var(--p600)", cursor: "pointer" }}>
                View all
              </span>
            </div>
            {sharedFiles.map((f) => (
              <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0" }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: f.type === "PDF" ? "#ef4457" : "#f3a622", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 8.5, fontWeight: 800 }}>
                  {f.type === "SKETCH" ? "◆" : f.type}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700 }}>{f.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text3)" }}>
                    {formatBytes(f.sizeBytes)} · {f.type}
                  </div>
                </div>
                <span style={{ fontSize: 11, color: "var(--text3)" }}>{listTime(f.updatedAt)}</span>
              </div>
            ))}
          </div>
          <div style={{ padding: "0 18px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13.5, fontWeight: 800 }}>Participants ({members.length})</span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--p600)", cursor: "pointer" }}>+ Add</span>
            </div>
            {members.map((p) => (
              <div key={p.userId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
                <Avatar name={p.name} color={p.avatarColor} size={34} fontSize={11}>
                  {p.initials}
                </Avatar>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>
                    {p.name}
                    {p.name === selfName ? " (You)" : ""}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--text2)", display: "flex", alignItems: "center", gap: 5 }}>
                    <PresenceDot presence={p.presence} size={6} /> {presenceLabel(p.presence)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </aside>
  );
}
