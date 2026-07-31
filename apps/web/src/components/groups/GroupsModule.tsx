"use client";
import { useRouter } from "next/navigation";
import * as React from "react";
import type { GroupDto } from "@chatter/contracts";
import { Avatar, presenceLabel } from "@chatter/ui";
import { fullDate, listTime, relativeTime } from "@/lib/format";
import { useGroup, useGroups } from "@/lib/queries";
import { AddPersonIcon, SearchIcon } from "../icons";

export function GroupsModule() {
  const groups = useGroups();
  const [q, setQ] = React.useState("");
  const [selId, setSelId] = React.useState<string | null>(null);
  const [isMobile, setIsMobile] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 760);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const list = (groups.data ?? []).filter((g) => !q || g.name.toLowerCase().includes(q.toLowerCase()));
  const effectiveSel = selId ?? list[0]?.id ?? null;
  const detail = useGroup(effectiveSel);

  if (isMobile === null) return null;

  if (isMobile) {
    return (
      <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 10 }}>
        {list.map((g) => (
          <div key={g.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 13, cursor: "pointer" }}>
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

  const cats = [
    { name: "My Groups", icon: "👥", count: list.length, active: true },
    { name: "Public", icon: "🌐", count: list.filter((g) => g.privacy === "PUBLIC").length },
    { name: "Private", icon: "🔒", count: list.filter((g) => g.privacy === "PRIVATE").length },
  ];

  return (
    <>
      <div style={{ width: 255, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: "1px solid var(--border)", background: "var(--bg)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px 10px" }}>
          <span style={{ fontSize: 16, fontWeight: 800 }}>Groups</span>
          <div className="hoverable" style={{ width: 30, height: 30, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text2)", cursor: "pointer", border: "1px solid var(--border)" }}>+</div>
        </div>
        <div style={{ margin: "0 14px 12px", display: "flex", alignItems: "center", gap: 8, background: "var(--muted)", borderRadius: 11, padding: "9px 12px", color: "var(--text3)" }}>
          <SearchIcon />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search groups..." style={{ border: "none", outline: "none", background: "transparent", font: "inherit", fontSize: 13, color: "var(--text)", width: "100%" }} />
        </div>
        <div style={{ padding: "0 10px", display: "flex", flexDirection: "column", gap: 2 }}>
          {cats.map((gc) => (
            <div
              key={gc.name}
              className={gc.active ? undefined : "hoverable"}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", borderRadius: 11, cursor: "pointer", fontWeight: 600, fontSize: 13.5, background: gc.active ? "var(--sel)" : "transparent", color: gc.active ? "var(--p600)" : "var(--text)" }}
            >
              <span style={{ opacity: 0.75 }}>{gc.icon}</span>
              <span style={{ flex: 1 }}>{gc.name}</span>
              <span style={{ fontSize: 11.5, fontWeight: 700, borderRadius: 99, padding: "2px 8px", background: gc.active ? "var(--p600)" : "var(--muted)", color: gc.active ? "#fff" : "var(--text2)" }}>{gc.count}</span>
            </div>
          ))}
        </div>
        <div className="hoverable" style={{ margin: "14px 14px 0", border: "1.5px dashed var(--p300)", borderRadius: 12, padding: 11, textAlign: "center", fontSize: 13.5, fontWeight: 700, color: "var(--p600)", cursor: "pointer" }}>
          + Create Group
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ margin: 14, background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 14, padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, fontSize: 13.5 }}>
            <span style={{ color: "var(--p600)" }}>💡</span> Quick Tip
          </div>
          <div style={{ fontSize: 12.5, color: "var(--text2)", lineHeight: 1.55, marginTop: 7 }}>Create a group to collaborate with your team or across departments.</div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--p600)", marginTop: 9, cursor: "pointer" }}>Learn more →</div>
        </div>
      </div>
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: "var(--bg-subtle)", borderRight: "1px solid var(--border)", maxWidth: 430 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px 10px", background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800 }}>My Groups</div>
            <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 2 }}>{list.length} groups</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5, color: "var(--text2)" }}>
            Sort by: <b style={{ color: "var(--text)" }}>Recent Activity</b> ▾
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
  const [tab, setTab] = React.useState("Overview");
  return (
    <>
      <div style={{ display: "flex", gap: 16, padding: "18px 24px 0" }}>
        <div style={{ width: 74, height: 74, borderRadius: 18, background: g.avatarColor ?? undefined, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 30, color: "#fff", fontWeight: 800 }}>{g.icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 21, fontWeight: 800 }}>{g.name}</span>
            <div className="hover-p700" style={{ marginLeft: "auto", background: "var(--p600)", color: "#fff", fontSize: 13, fontWeight: 700, borderRadius: 10, padding: "8px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}>
              <AddPersonIcon size={14} strokeWidth={1.8} /> Invite
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
            <div style={overviewCard}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 800, fontSize: 13.5 }}>Upcoming Events</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--p600)", cursor: "pointer" }}>View all</span>
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
              <div style={{ textAlign: "center", fontSize: 13, fontWeight: 700, color: "var(--p600)", paddingTop: 12, cursor: "pointer" }}>+ Add Event</div>
            </div>
            <div style={overviewCard}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 800, fontSize: 13.5 }}>Recent Announcements</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--p600)", cursor: "pointer" }}>View all</span>
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
              <div style={{ textAlign: "center", fontSize: 13, fontWeight: 700, color: "var(--p600)", paddingTop: 12, cursor: "pointer" }}>+ New Announcement</div>
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
