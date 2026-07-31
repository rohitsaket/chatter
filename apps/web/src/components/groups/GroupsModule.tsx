"use client";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { GroupDto } from "@chatter/contracts";
import { Avatar, presenceLabel } from "@chatter/ui";
import { api, API_URL } from "@/lib/api";
import { formatBytes, fullDate, listTime, relativeTime } from "@/lib/format";
import { useContacts, useFiles, useGroup, useGroups } from "@/lib/queries";
import { DotsMenu } from "../common/Menu";
import { AddPersonIcon, SearchIcon } from "../icons";

type GroupCat = "My Groups" | "Public" | "Private";
type GroupSort = "Recent Activity" | "Name";

export function GroupsModule() {
  const groups = useGroups();
  const [q, setQ] = React.useState("");
  const [selId, setSelId] = React.useState<string | null>(null);
  const [cat, setCat] = React.useState<GroupCat>("My Groups");
  const [sort, setSort] = React.useState<GroupSort>("Recent Activity");
  const [creating, setCreating] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [isMobile, setIsMobile] = React.useState<boolean | null>(null);
  const qc = useQueryClient();
  const router = useRouter();

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 760);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const createGroup = useMutation({
    mutationFn: (name: string) => api<GroupDto>("/groups", { method: "POST", json: { name, privacy: "PRIVATE", icon: "👥" } }),
    onSuccess: (g) => {
      setCreating(false);
      setNewName("");
      setSelId(g.id);
      void qc.invalidateQueries({ queryKey: ["groups"] });
      void qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const list = (groups.data ?? [])
    .filter((g) => !q || g.name.toLowerCase().includes(q.toLowerCase()))
    .filter((g) => (cat === "Public" ? g.privacy === "PUBLIC" : cat === "Private" ? g.privacy === "PRIVATE" : true))
    .sort((a, b) => {
      if (sort === "Name") return a.name.localeCompare(b.name);
      const at = a.lastActivity?.at ?? a.createdAt;
      const bt = b.lastActivity?.at ?? b.createdAt;
      return bt.localeCompare(at);
    });
  const effectiveSel = selId ?? list[0]?.id ?? null;
  const detail = useGroup(effectiveSel);

  if (isMobile === null) return null;

  if (isMobile) {
    return (
      <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 10 }}>
        {list.map((g) => (
          <div
            key={g.id}
            onClick={() => g.conversationSlug && router.push(`/app/chats/${g.conversationSlug}`)}
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 13, cursor: "pointer" }}
          >
            <div style={{ display: "flex", gap: 11, alignItems: "center" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: g.avatarColor ?? undefined, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>{g.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 14 }}>{g.name}</div>
                <div style={{ fontSize: 12, color: "var(--text2)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>{g.description}</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 14.5, fontWeight: 800 }}>{g.memberCount}</div>
                <div style={{ fontSize: 10, color: "var(--text2)" }}>Members</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const allGroups = groups.data ?? [];
  const cats: { name: GroupCat; icon: string; count: number }[] = [
    { name: "My Groups", icon: "👥", count: allGroups.length },
    { name: "Public", icon: "🌐", count: allGroups.filter((g) => g.privacy === "PUBLIC").length },
    { name: "Private", icon: "🔒", count: allGroups.filter((g) => g.privacy === "PRIVATE").length },
  ];

  return (
    <>
      <div style={{ width: 255, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: "1px solid var(--border)", background: "var(--bg)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px 10px" }}>
          <span style={{ fontSize: 16, fontWeight: 800 }}>Groups</span>
          <div
            className="hoverable"
            onClick={() => setCreating((c) => !c)}
            style={{ width: 30, height: 30, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text2)", cursor: "pointer", border: "1px solid var(--border)" }}
          >
            +
          </div>
        </div>
        <div style={{ margin: "0 14px 12px", display: "flex", alignItems: "center", gap: 8, background: "var(--muted)", borderRadius: 11, padding: "9px 12px", color: "var(--text3)" }}>
          <SearchIcon />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search groups..." style={{ border: "none", outline: "none", background: "transparent", font: "inherit", fontSize: 13, color: "var(--text)", width: "100%" }} />
        </div>
        <div style={{ padding: "0 10px", display: "flex", flexDirection: "column", gap: 2 }}>
          {cats.map((gc) => {
            const active = cat === gc.name;
            return (
              <div
                key={gc.name}
                className={active ? undefined : "hoverable"}
                onClick={() => setCat(gc.name)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", borderRadius: 11, cursor: "pointer", fontWeight: 600, fontSize: 13.5, background: active ? "var(--sel)" : "transparent", color: active ? "var(--p600)" : "var(--text)" }}
              >
                <span style={{ opacity: 0.75 }}>{gc.icon}</span>
                <span style={{ flex: 1 }}>{gc.name}</span>
                <span style={{ fontSize: 11.5, fontWeight: 700, borderRadius: 99, padding: "2px 8px", background: active ? "var(--p600)" : "var(--muted)", color: active ? "#fff" : "var(--text2)" }}>{gc.count}</span>
              </div>
            );
          })}
        </div>
        {creating ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newName.trim()) createGroup.mutate(newName.trim());
            }}
            style={{ margin: "14px 14px 0", border: "1.5px dashed var(--p300)", borderRadius: 12, padding: 10, display: "flex", flexDirection: "column", gap: 8 }}
          >
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Group name..."
              style={{ border: "1px solid var(--border)", borderRadius: 9, padding: "8px 10px", font: "inherit", fontSize: 13, color: "var(--text)", background: "var(--bg)", outline: "none" }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="submit"
                disabled={!newName.trim() || createGroup.isPending}
                style={{ flex: 1, background: "var(--p600)", color: "#fff", fontSize: 12.5, fontWeight: 700, border: "none", borderRadius: 9, padding: "8px 0", cursor: "pointer", font: "inherit", opacity: !newName.trim() || createGroup.isPending ? 0.6 : 1 }}
              >
                {createGroup.isPending ? "Creating…" : "Create"}
              </button>
              <button
                type="button"
                onClick={() => setCreating(false)}
                style={{ background: "transparent", color: "var(--text2)", fontSize: 12.5, fontWeight: 700, border: "1px solid var(--border)", borderRadius: 9, padding: "8px 12px", cursor: "pointer", font: "inherit" }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div
            className="hoverable"
            onClick={() => setCreating(true)}
            style={{ margin: "14px 14px 0", border: "1.5px dashed var(--p300)", borderRadius: 12, padding: 11, textAlign: "center", fontSize: 13.5, fontWeight: 700, color: "var(--p600)", cursor: "pointer" }}
          >
            + Create Group
          </div>
        )}
        <div style={{ flex: 1 }} />
        <div style={{ margin: 14, background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 14, padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, fontSize: 13.5 }}>
            <span style={{ color: "var(--p600)" }}>💡</span> Quick Tip
          </div>
          <div style={{ fontSize: 12.5, color: "var(--text2)", lineHeight: 1.55, marginTop: 7 }}>Create a group to collaborate with your team or across departments.</div>
        </div>
      </div>
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: "var(--bg-subtle)", borderRight: "1px solid var(--border)", maxWidth: 430 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px 10px", background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800 }}>My Groups</div>
            <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 2 }}>{list.length} groups</div>
          </div>
          <div
            onClick={() => setSort(sort === "Recent Activity" ? "Name" : "Recent Activity")}
            style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5, color: "var(--text2)", cursor: "pointer", userSelect: "none" }}
          >
            Sort by: <b style={{ color: "var(--text)" }}>{sort}</b> ▾
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 11 }}>
          {list.map((g) => (
            <GroupCard key={g.id} g={g} selected={g.id === effectiveSel} onClick={() => setSelId(g.id)} />
          ))}
        </div>
      </main>
      <aside style={{ flex: 1, minWidth: 0, background: "var(--bg)", overflowY: "auto" }}>
        {detail.data ? <GroupOverview g={detail.data} /> : <div style={{ padding: 40, color: "var(--text3)", fontSize: 13 }}>Loading…</div>}
      </aside>
    </>
  );
}

function GroupCard({ g, selected, onClick }: { g: GroupDto; selected: boolean; onClick: () => void }) {
  return (
    <div
      className="hover-border"
      onClick={onClick}
      style={{ background: "var(--surface)", border: `1.5px solid ${selected ? "var(--p500)" : "var(--border)"}`, borderRadius: 15, padding: 14, cursor: "pointer", boxShadow: "var(--shadow)", position: "relative" }}
    >
      {g.unreadCount > 0 && (
        <span style={{ position: "absolute", top: 12, right: 12, background: "var(--p600)", color: "#fff", fontSize: 10.5, fontWeight: 700, borderRadius: 99, padding: "2px 7px" }}>{g.unreadCount}</span>
      )}
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ width: 48, height: 48, borderRadius: 13, background: g.avatarColor ?? undefined, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, flexShrink: 0, color: "#fff", fontWeight: 800 }}>{g.icon}</div>
        <div style={{ flex: 1, minWidth: 0, paddingRight: 34 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 800, fontSize: 14 }}>{g.name}</span>
            <span style={{ fontSize: 10.5, fontWeight: 700, borderRadius: 99, padding: "2.5px 8px", background: g.privacy === "PUBLIC" ? "#e6f8ee" : "var(--p100)", color: g.privacy === "PUBLIC" ? "var(--good)" : "var(--p600)" }}>
              {g.privacy === "PUBLIC" ? "🌐 Public" : "🔒 Private"}
            </span>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--text2)", lineHeight: 1.5, marginTop: 4 }}>{g.description}</div>
        </div>
        <div style={{ textAlign: "center", flexShrink: 0, alignSelf: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{g.memberCount}</div>
          <div style={{ fontSize: 11, color: "var(--text2)" }}>Members</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 11, fontSize: 12, color: "var(--text2)" }}>
        <div style={{ display: "flex" }}>
          {["linear-gradient(135deg,#a873ff,#5e28c7)", "linear-gradient(135deg,#5b8def,#2c4fa3)", "linear-gradient(135deg,#43c0a8,#1f7a68)"].map((bg, i) => (
            <div key={i} style={{ width: 22, height: 22, borderRadius: "50%", background: bg, border: "2px solid var(--surface)", marginLeft: i ? -7 : 0 }} />
          ))}
          <div style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--muted)", border: "2px solid var(--surface)", marginLeft: -7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8.5, fontWeight: 700, color: "var(--text2)" }}>
            +{Math.max(0, g.memberCount - 3)}
          </div>
        </div>
        <span style={{ flex: 1 }}>{g.lastActivity ? `💬 ${g.lastActivity.text}` : ""}</span>
        <span style={{ color: "var(--text3)" }}>{g.lastActivity ? listTime(g.lastActivity.at) : listTime(g.createdAt)}</span>
      </div>
    </div>
  );
}

function GroupOverview({ g }: { g: GroupDto }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = React.useState("Overview");
  const contacts = useContacts();

  const addMember = useMutation({
    mutationFn: (userId: string) => api(`/groups/${g.id}/members`, { method: "POST", json: { userId } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["group", g.id] }),
  });
  const leave = useMutation({
    mutationFn: () => api(`/groups/${g.id}/leave`, { method: "POST" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["groups"] });
      void qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const memberIds = new Set((g.members ?? []).map((m) => m.userId));
  const invitable = (contacts.data ?? []).filter((c) => !memberIds.has(c.id)).slice(0, 8);

  return (
    <>
      <div style={{ display: "flex", gap: 16, padding: "18px 24px 0" }}>
        <div style={{ width: 74, height: 74, borderRadius: 18, background: g.avatarColor ?? undefined, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 30, color: "#fff", fontWeight: 800 }}>{g.icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 21, fontWeight: 800 }}>{g.name}</span>
            <div style={{ marginLeft: "auto" }}>
              <DotsMenu
                size={0}
                trigger={
                  <div className="hover-p700" style={{ background: "var(--p600)", color: "#fff", fontSize: 13, fontWeight: 700, borderRadius: 10, padding: "8px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}>
                    <AddPersonIcon size={14} strokeWidth={1.8} /> Invite
                  </div>
                }
                triggerStyle={{ width: "auto", height: "auto", display: "block" }}
                items={
                  invitable.length > 0
                    ? invitable.map((c) => ({ label: c.name, onClick: () => addMember.mutate(c.id) }))
                    : [{ label: "Everyone is already a member", onClick: () => void 0 }]
                }
              />
            </div>
          </div>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: "var(--p600)", background: "var(--p100)", borderRadius: 99, padding: "3px 10px", marginTop: 5 }}>
            {g.privacy === "PUBLIC" ? "🌐 Public Group" : "🔒 Private Group"}
          </span>
          <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 7 }}>{g.description}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 9, fontSize: 12.5, color: "var(--text2)" }}>
            <b style={{ color: "var(--text)" }}>{g.memberCount} Members</b>
            {g.createdByName && <>· Created by {g.createdByName} on {fullDate(g.createdAt)}</>}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 22, padding: "16px 24px 0", borderBottom: "1px solid var(--border)", fontSize: 13.5, fontWeight: 600, color: "var(--text2)" }}>
        {["Overview", "Members", "Media", "Files", "Events", "Settings"].map((t) => (
          <div
            key={t}
            onClick={() => setTab(t)}
            style={{ color: tab === t ? "var(--p600)" : undefined, borderBottom: tab === t ? "2px solid var(--p600)" : "2px solid transparent", paddingBottom: 10, cursor: "pointer" }}
          >
            {t}
          </div>
        ))}
      </div>
      {tab === "Members" ? (
        <div style={{ padding: "16px 24px" }}>
          {(g.members ?? []).map((m) => (
            <div key={m.userId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0" }}>
              <Avatar name={m.name} color={m.avatarColor} size={36} fontSize={12}>{m.initials}</Avatar>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{m.name}</div>
                <div style={{ fontSize: 11.5, color: "var(--text2)" }}>{presenceLabel(m.presence)}</div>
              </div>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--p600)", background: "var(--p100)", borderRadius: 99, padding: "3px 9px" }}>
                {m.role === "ADMIN" || m.role === "OWNER" ? "Admin" : m.role === "MODERATOR" ? "Moderator" : "Member"}
              </span>
            </div>
          ))}
        </div>
      ) : tab === "Media" || tab === "Files" ? (
        <GroupFilesTab g={g} imagesOnly={tab === "Media"} />
      ) : tab === "Events" ? (
        <div style={{ padding: "16px 24px", maxWidth: 460 }}>
          <EventsCard g={g} />
        </div>
      ) : tab === "Settings" ? (
        <div style={{ padding: "16px 24px", maxWidth: 460, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={overviewCard}>
            <div style={{ fontWeight: 800, fontSize: 13.5 }}>About</div>
            <div style={{ fontSize: 12.5, color: "var(--text2)", lineHeight: 1.6, marginTop: 8 }}>{g.description}</div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 13, borderTop: "1px solid var(--border)", marginTop: 12, paddingTop: 12 }}>
              <span style={{ color: "var(--text2)" }}>Privacy</span>
              <span style={{ fontWeight: 600 }}>{g.privacy === "PUBLIC" ? "Public" : "Private"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 13 }}>
              <span style={{ color: "var(--text2)" }}>Members</span>
              <span style={{ fontWeight: 600 }}>{g.memberCount}</span>
            </div>
            {g.createdByName && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 13 }}>
                <span style={{ color: "var(--text2)" }}>Created by</span>
                <span style={{ fontWeight: 600 }}>{g.createdByName}</span>
              </div>
            )}
          </div>
          <div style={overviewCard}>
            <div style={{ fontWeight: 800, fontSize: 13.5 }}>Danger Zone</div>
            <div style={{ fontSize: 12.5, color: "var(--text2)", marginTop: 8, lineHeight: 1.55 }}>
              Leaving removes this group and its conversation from your workspace. The group&apos;s owner cannot leave.
            </div>
            <div
              onClick={() => leave.mutate()}
              style={{ marginTop: 12, border: "1px solid var(--bad)", color: "var(--bad)", fontSize: 13, fontWeight: 700, borderRadius: 10, padding: "9px 0", textAlign: "center", cursor: "pointer", opacity: leave.isPending ? 0.6 : 1 }}
            >
              {leave.isError ? "Could not leave (are you the owner?)" : leave.isPending ? "Leaving…" : "Leave Group"}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, padding: "16px 24px 24px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={overviewCard}>
              <div style={{ fontWeight: 800, fontSize: 13.5 }}>About</div>
              <div style={{ fontSize: 12.5, color: "var(--text2)", lineHeight: 1.6, marginTop: 8 }}>{g.description}</div>
              {g.tags.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 11 }}>
                  {g.tags.map((t) => (
                    <span key={t} style={{ fontSize: 11, fontWeight: 700, color: "var(--p600)", background: "var(--p100)", borderRadius: 99, padding: "4px 11px" }}>{t}</span>
                  ))}
                </div>
              )}
            </div>
            <div style={overviewCard}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 800, fontSize: 13.5 }}>Open the conversation</span>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--text2)", marginTop: 8, lineHeight: 1.55 }}>
                Jump into {g.name}&apos;s chat thread to see messages, files and polls.
              </div>
              <div
                className="hover-p700"
                onClick={() => router.push(`/app/chats/${g.conversationSlug ?? ""}`)}
                style={{ marginTop: 12, background: "var(--p600)", color: "#fff", fontSize: 13, fontWeight: 700, borderRadius: 10, padding: "9px 0", textAlign: "center", cursor: "pointer" }}
              >
                Open Chat
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <EventsCard g={g} />
            <div style={overviewCard}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 800, fontSize: 13.5 }}>Recent Announcements</span>
              </div>
              {(g.announcements ?? []).map((ga) => (
                <div key={ga.id} style={{ display: "flex", gap: 11, padding: "11px 0", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--p100)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--p600)", flexShrink: 0 }}>📣</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700 }}>{ga.title}</div>
                    <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>
                      {relativeTime(ga.createdAt)}{ga.authorName ? ` · ${ga.authorName}` : ""}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--text2)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ga.body}</div>
                  </div>
                </div>
              ))}
              {(g.announcements ?? []).length === 0 && <div style={{ fontSize: 12.5, color: "var(--text3)", padding: "10px 0" }}>No announcements.</div>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const overviewCard: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 15,
  padding: 16,
  boxShadow: "var(--shadow)",
};

function EventsCard({ g }: { g: GroupDto }) {
  return (
    <div style={overviewCard}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontWeight: 800, fontSize: 13.5 }}>Upcoming Events</span>
      </div>
      {(g.events ?? []).map((ge) => {
        const d = new Date(ge.startsAt);
        return (
          <div key={ge.id} style={{ display: "flex", gap: 12, padding: "11px 0", borderBottom: "1px solid var(--border)" }}>
            <div style={{ width: 46, height: 50, borderRadius: 11, background: "var(--p100)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 9.5, fontWeight: 800, color: "var(--p600)", letterSpacing: ".05em" }}>{d.toLocaleString("en", { month: "short" }).toUpperCase()}</span>
              <span style={{ fontSize: 17, fontWeight: 800, color: "var(--p700)" }}>{d.getDate()}</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{ge.name}</div>
              <div style={{ fontSize: 11.5, color: "var(--text2)", marginTop: 3 }}>
                {fullDate(ge.startsAt)} · {d.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" })}
              </div>
              {ge.location && (
                <div style={{ fontSize: 11.5, color: "var(--text2)", marginTop: 3, display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--good)" }} />
                  {ge.location}
                </div>
              )}
            </div>
          </div>
        );
      })}
      {(g.events ?? []).length === 0 && <div style={{ fontSize: 12.5, color: "var(--text3)", padding: "10px 0" }}>No upcoming events.</div>}
    </div>
  );
}

const IMAGE_TYPES = ["PNG", "JPG", "MP4"];

function GroupFilesTab({ g, imagesOnly }: { g: GroupDto; imagesOnly: boolean }) {
  const files = useFiles();
  const rows = (files.data ?? [])
    .filter((f) => f.sharedIn === g.name)
    .filter((f) => (imagesOnly ? IMAGE_TYPES.includes(f.type) : true));
  return (
    <div style={{ padding: "16px 24px", maxWidth: 560 }}>
      {rows.map((f) => (
        <a
          key={f.id}
          href={`${API_URL}/api/v1/files/${f.id}/download`}
          className="hoverable"
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 6px", borderRadius: 10, color: "inherit", textDecoration: "none", borderBottom: "1px solid var(--border)" }}
        >
          <div style={{ width: 34, height: 34, borderRadius: 9, background: "var(--p100)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--p600)", fontSize: 8.5, fontWeight: 800, flexShrink: 0 }}>
            {f.type.slice(0, 3)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.name}</div>
            <div style={{ fontSize: 11.5, color: "var(--text3)" }}>{formatBytes(f.sizeBytes)} · {f.type}</div>
          </div>
          <span style={{ fontSize: 11.5, color: "var(--text3)" }}>{listTime(f.updatedAt)}</span>
        </a>
      ))}
      {rows.length === 0 && (
        <div style={{ fontSize: 13, color: "var(--text3)", padding: "20px 0" }}>
          No {imagesOnly ? "media" : "files"} shared in {g.name} yet.
        </div>
      )}
    </div>
  );
}
