"use client";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ConversationDto } from "@chatter/contracts";
import { Avatar, PresenceDot, presenceLabel } from "@chatter/ui";
import { api } from "@/lib/api";
import { useContacts, useFiles } from "@/lib/queries";
import { useUiStore } from "@/lib/store";
import { formatBytes, listTime } from "@/lib/format";
import { DotsMenu } from "../common/Menu";
import { CloseIcon, DotsHIcon, LeaveIcon, PhoneIcon, SearchIcon, VideoIcon } from "../icons";

export function DetailPanel({ conv, selfName }: { conv: ConversationDto; selfName: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { setDetailOpen, setThreadSearch } = useUiStore();
  const files = useFiles();
  const contacts = useContacts();
  const [showAllMembers, setShowAllMembers] = React.useState(false);
  const isGroup = conv.kind === "GROUP";
  const sharedFiles = (files.data ?? []).filter((f) => !isGroup || f.sharedIn === conv.name).slice(0, 3);
  const members = conv.participants ?? [];

  const convAction = useMutation({
    mutationFn: (action: "favorite" | "mute" | "archive") => api(`/conversations/${conv.slug ?? conv.id}/${action}`, { method: "POST" }),
    onSuccess: (_d, action) => {
      void qc.invalidateQueries({ queryKey: ["conversations"] });
      void qc.invalidateQueries({ queryKey: ["conversation"] });
      if (action === "archive") router.push("/app/chats");
    },
  });
  const addMember = useMutation({
    mutationFn: (userId: string) => api(`/groups/${conv.groupId}/members`, { method: "POST", json: { userId } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["conversation"] });
      void qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
  const leaveGroup = useMutation({
    mutationFn: () => api(`/groups/${conv.groupId}/leave`, { method: "POST" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["conversations"] });
      void qc.invalidateQueries({ queryKey: ["groups"] });
      router.push("/app/chats");
    },
  });

  const memberIds = new Set(members.map((m) => m.userId));
  const invitable = (contacts.data ?? []).filter((c) => !memberIds.has(c.id)).slice(0, 8);

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
            { label: "Audio", icon: <PhoneIcon size={17} strokeWidth={1.7} />, onClick: () => router.push("/app/calls") },
            { label: "Video", icon: <VideoIcon />, onClick: () => router.push("/app/calls") },
            { label: "Search", icon: <SearchIcon size={17} />, onClick: () => setThreadSearch("") },
          ].map((a) => (
            <div
              key={a.label}
              className="hoverable-sel"
              onClick={a.onClick}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: "var(--muted)", borderRadius: 12, padding: "11px 4px", cursor: "pointer", color: "var(--accent-text)" }}
            >
              {a.icon}
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text2)" }}>{a.label}</span>
            </div>
          ))}
          <DotsMenu
            size={0}
            trigger={
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: "var(--muted)", borderRadius: 12, padding: "11px 4px", cursor: "pointer", color: "var(--accent-text)", width: "100%" }}>
                <DotsHIcon />
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text2)" }}>More</span>
              </div>
            }
            triggerStyle={{ width: "100%", height: "auto", display: "block" }}
            items={[
              { label: conv.favorite ? "Remove from favorites" : "Add to favorites", onClick: () => convAction.mutate("favorite") },
              { label: conv.muted ? "Unmute conversation" : "Mute conversation", onClick: () => convAction.mutate("mute") },
              { label: conv.archived ? "Unarchive conversation" : "Archive conversation", onClick: () => convAction.mutate("archive") },
            ]}
          />
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
              <DotsMenu
                size={0}
                trigger={<span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--accent-text)", cursor: "pointer" }}>+ Add Member</span>}
                triggerStyle={{ width: "auto", height: "auto", display: "block" }}
                items={
                  invitable.length > 0
                    ? invitable.map((c) => ({ label: c.name, onClick: () => addMember.mutate(c.id) }))
                    : [{ label: "Everyone is already a member", onClick: () => void 0 }]
                }
              />
            </div>
            {members.slice(0, showAllMembers ? members.length : 4).map((gm) => (
              <div key={gm.userId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
                <Avatar name={gm.name} color={gm.avatarColor} size={34} fontSize={11} presenceDot={gm.presence === "ONLINE" ? "var(--good)" : gm.presence === "AWAY" ? "var(--warn)" : "var(--border2)"}>
                  {gm.initials}
                </Avatar>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{gm.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text2)" }}>{presenceLabel(gm.presence)}</div>
                </div>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--accent-text)", background: "var(--p100)", borderRadius: 99, padding: "3px 9px" }}>
                  {gm.role === "OWNER" || gm.role === "ADMIN" ? "Admin" : gm.role === "MODERATOR" ? "Moderator" : "Member"}
                </span>
              </div>
            ))}
            <div
              onClick={() => setShowAllMembers((v) => !v)}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, fontSize: 13, fontWeight: 600, color: "var(--text2)", cursor: "pointer" }}
            >
              {showAllMembers ? "Show fewer members" : "View all members"} <span style={{ color: "var(--text3)" }}>{showAllMembers ? "▴" : "›"}</span>
            </div>
          </div>
          <div style={{ padding: "8px 18px 14px" }}>
            <div
              onClick={() => leaveGroup.mutate()}
              style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--bad)", fontSize: 13.5, fontWeight: 700, cursor: "pointer", padding: "12px 0 2px", opacity: leaveGroup.isPending ? 0.6 : 1 }}
            >
              <LeaveIcon /> {leaveGroup.isError ? "Could not leave (are you the owner?)" : "Leave Group"}
            </div>
          </div>
        </>
      ) : (
        <>
          <div style={{ padding: "14px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13.5, fontWeight: 800 }}>Shared Files</span>
              <span onClick={() => router.push("/app/files")} style={{ fontSize: 12.5, fontWeight: 700, color: "var(--accent-text)", cursor: "pointer" }}>
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
