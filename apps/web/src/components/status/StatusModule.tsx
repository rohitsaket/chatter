"use client";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { StatusDto } from "@chatter/contracts";
import { Avatar } from "@chatter/ui";
import { api } from "@/lib/api";
import { relativeTime, clockTime } from "@/lib/format";
import { useMe, useStatuses } from "@/lib/queries";
import { CameraIcon, CloseIcon, DotsHIcon, GroupsIcon, LockIcon, MuteBellIcon, SendIcon, ShareIcon, ArchiveIcon, TrashIcon, EmojiIcon } from "../icons";

export function StatusModule() {
  const me = useMe();
  const statuses = useStatuses();
  const qc = useQueryClient();
  const router = useRouter();
  const [selIdx, setSelIdx] = React.useState(0);
  const [reply, setReply] = React.useState("");
  const [isMobile, setIsMobile] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 760);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const all = React.useMemo(() => statuses.data ?? [], [statuses.data]);
  const others = React.useMemo(() => all.filter((s) => s.owner.id !== me.data?.id), [all, me.data?.id]);
  const recent = others.filter((s) => !s.viewedByMe);
  const viewed = others.filter((s) => s.viewedByMe);
  const ordered = React.useMemo(() => [...recent, ...viewed], [recent, viewed]);
  const current: StatusDto | undefined = ordered[Math.min(selIdx, Math.max(0, ordered.length - 1))];

  const viewMut = useMutation({
    mutationFn: (id: string) => api<StatusDto>(`/statuses/${id}/view`, { method: "POST" }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["statuses"] }),
  });
  const reactMut = useMutation({
    mutationFn: ({ id, emoji }: { id: string; emoji: string }) => api<StatusDto>(`/statuses/${id}/react`, { method: "POST", json: { emoji } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["statuses"] }),
  });
  const replyMut = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) =>
      api<{ slug: string | null; conversationId: string }>(`/statuses/${id}/reply`, { method: "POST", json: { text } }),
    onSuccess: (res) => router.push(`/app/chats/${res.slug ?? res.conversationId}`),
  });

  // Record the view once per shown status.
  const viewedRef = React.useRef(new Set<string>());
  React.useEffect(() => {
    if (current && !current.viewedByMe && !viewedRef.current.has(current.id)) {
      viewedRef.current.add(current.id);
      viewMut.mutate(current.id);
    }
    // (deps intentionally limited)
  }, [current?.id]);

  // Auto-advance every 5s.
  React.useEffect(() => {
    if (ordered.length === 0) return;
    const t = setInterval(() => setSelIdx((i) => (i + 1) % ordered.length), 5000);
    return () => clearInterval(t);
  }, [ordered.length]);

  function sendReply() {
    const text = reply.trim();
    if (!text || !current) return;
    setReply("");
    replyMut.mutate({ id: current.id, text });
  }

  if (isMobile === null) return null;

  const feed = (
    <div style={{ width: isMobile ? "100%" : 300, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: isMobile ? "none" : "1px solid var(--border)", background: "var(--bg)", overflowY: "auto" }}>
      <div style={{ padding: "16px 18px 8px", fontSize: 16, fontWeight: 800 }}>My Status</div>
      <div style={{ margin: "4px 12px 10px", display: "flex", alignItems: "center", gap: 12, padding: 12, border: "1px solid var(--border)", borderRadius: 14, background: "var(--surface)", boxShadow: "var(--shadow)" }}>
        {me.data && (
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: me.data.avatarColor ?? undefined, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 15, fontWeight: 700, border: "2.5px dashed var(--p300)" }}>
            {me.data.initials}
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 13.5 }}>My Status</div>
          <div style={{ fontSize: 12, color: "var(--text2)" }}>Tap to add status update</div>
        </div>
        <div
          onClick={() =>
            api("/statuses", { method: "POST", json: { caption: "Shared from Chatter web" } }).then(() => qc.invalidateQueries({ queryKey: ["statuses"] }))
          }
          style={{ width: 36, height: 36, borderRadius: 10, background: "var(--p100)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--p600)", cursor: "pointer" }}
        >
          <CameraIcon />
        </div>
      </div>
      <div style={{ padding: "8px 18px 4px", fontSize: 11, fontWeight: 700, color: "var(--text3)", letterSpacing: ".06em" }}>RECENT UPDATES</div>
      <div style={{ padding: "0 8px" }}>
        {recent.map((s) => (
          <StatusRow key={s.id} s={s} ringColor="var(--p500)" selected={current?.id === s.id} onClick={() => setSelIdx(ordered.indexOf(s))} />
        ))}
        {recent.length === 0 && <div style={{ padding: "8px 12px", fontSize: 12.5, color: "var(--text3)" }}>All caught up.</div>}
      </div>
      <div style={{ padding: "14px 18px 4px", fontSize: 11, fontWeight: 700, color: "var(--text3)", letterSpacing: ".06em", borderTop: "1px solid var(--border)", marginTop: 8 }}>
        VIEWED UPDATES
      </div>
      <div style={{ padding: "0 8px 16px" }}>
        {viewed.map((s) => (
          <StatusRow key={s.id} s={s} ringColor="var(--border2)" selected={current?.id === s.id} onClick={() => setSelIdx(ordered.indexOf(s))} />
        ))}
        {viewed.length === 0 && <div style={{ padding: "8px 12px", fontSize: 12.5, color: "var(--text3)" }}>Nothing viewed yet.</div>}
      </div>
    </div>
  );

  if (isMobile) return feed;

  return (
    <>
      {feed}
      <main style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "stretch", justifyContent: "center", background: "var(--bg-subtle)", padding: 14 }}>
        {current ? (
          <div style={{ position: "relative", flex: 1, maxWidth: 580, borderRadius: 22, overflow: "hidden", background: "#101322", display: "flex", flexDirection: "column", boxShadow: "0 20px 50px -18px rgba(23,21,37,.45)" }}>
            <div style={{ position: "absolute", inset: 0, background: current.mediaStyle ?? "linear-gradient(150deg,#2c2650,#1a1538 55%,#0e0b22)" }} />
            <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(45deg,transparent,transparent 26px,rgba(255,255,255,.03) 26px,rgba(255,255,255,.03) 52px)" }} />
            <div style={{ position: "relative", display: "flex", gap: 6, padding: "14px 16px 0" }}>
              {ordered.map((s, i) => (
                <div key={s.id} style={{ flex: 1, height: 4, borderRadius: 99, background: "rgba(255,255,255,.28)", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      borderRadius: 99,
                      background: i <= selIdx ? "var(--p500)" : "transparent",
                      width: i < selIdx ? "100%" : i === selIdx ? "100%" : "0%",
                      animation: i === selIdx ? "ct-progress 5s linear" : "none",
                    }}
                  />
                </div>
              ))}
            </div>
            <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 11, padding: "14px 16px" }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: current.owner.avatarColor ?? undefined, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 700, border: "2px solid rgba(255,255,255,.7)" }}>
                {current.owner.initials}
              </div>
              <div style={{ flex: 1, color: "#fff" }}>
                <div style={{ fontWeight: 800, fontSize: 15 }}>{current.owner.name}</div>
                <div style={{ fontSize: 12.5, opacity: 0.75 }}>{relativeTime(current.createdAt)}</div>
              </div>
              <div style={{ display: "flex", gap: 14, color: "#fff", opacity: 0.9 }}>
                <DotsHIcon size={18} style={{ cursor: "pointer" }} />
                <span onClick={() => router.push("/app/chats")} style={{ cursor: "pointer", display: "flex" }}>
                  <CloseIcon size={17} strokeWidth={1.9} />
                </span>
              </div>
            </div>
            <div style={{ position: "relative", flex: 1 }} onClick={() => setSelIdx((selIdx + 1) % Math.max(1, ordered.length))} />
            <div style={{ position: "relative", padding: "0 20px 14px", color: "#fff" }}>
              {current.caption && (
                <div style={{ fontSize: 15.5, lineHeight: 1.6, textShadow: "0 1px 8px rgba(0,0,0,.4)", whiteSpace: "pre-line" }}>{current.caption}</div>
              )}
              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <div style={{ flex: 1, display: "flex", alignItems: "center", background: "rgba(16,19,34,.45)", border: "1px solid rgba(255,255,255,.25)", borderRadius: 13, padding: "4px 6px 4px 16px", backdropFilter: "blur(6px)" }}>
                  <input
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        sendReply();
                      }
                    }}
                    placeholder={`Reply to ${current.owner.name.split(" ")[0]}...`}
                    style={{ flex: 1, border: "none", outline: "none", background: "transparent", font: "inherit", fontSize: 13.5, color: "#fff", padding: "9px 0" }}
                  />
                </div>
                <div onClick={sendReply} style={{ width: 48, borderRadius: 13, background: "var(--p600)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <SendIcon size={17} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 9, marginTop: 12 }}>
                {["❤️", "👍", "🔥"].map((e) => {
                  const count = current.reactions.find((r) => r.emoji === e)?.count ?? 0;
                  return (
                    <div
                      key={e}
                      className="hover-wash-strong"
                      onClick={() => reactMut.mutate({ id: current.id, emoji: e })}
                      style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(16,19,34,.5)", border: "1px solid rgba(255,255,255,.22)", borderRadius: 12, padding: "8px 14px", fontSize: 13.5, color: "#fff", cursor: "pointer", backdropFilter: "blur(6px)" }}
                    >
                      {e} <span style={{ fontWeight: 700, fontSize: 12.5 }}>{count}</span>
                    </div>
                  );
                })}
                <div style={{ display: "flex", alignItems: "center", background: "rgba(16,19,34,.5)", border: "1px solid rgba(255,255,255,.22)", borderRadius: 12, padding: "8px 12px", color: "#fff", cursor: "pointer", backdropFilter: "blur(6px)" }}>
                  <EmojiIcon size={16} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ alignSelf: "center", color: "var(--text3)", fontSize: 13.5 }}>
            {statuses.isLoading ? "Loading…" : "No active status updates."}
          </div>
        )}
      </main>
      {current && <StatusDetails s={current} />}
    </>
  );
}

function StatusRow({ s, ringColor, selected, onClick }: { s: StatusDto; ringColor: string; selected: boolean; onClick: () => void }) {
  return (
    <div
      className={selected ? undefined : "hoverable"}
      onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 10px", borderRadius: 12, cursor: "pointer", background: selected ? "var(--sel)" : "transparent" }}
    >
      <div style={{ width: 44, height: 44, borderRadius: "50%", background: s.owner.avatarColor ?? undefined, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 700, border: `2.5px solid ${ringColor}`, boxShadow: "0 0 0 2px var(--bg) inset" }}>
        {s.owner.initials}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5 }}>{s.owner.name}</div>
        <div style={{ fontSize: 12, color: "var(--text2)" }}>{relativeTime(s.createdAt)}</div>
      </div>
      {!s.viewedByMe && <span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--p500)" }} />}
    </div>
  );
}

function StatusDetails({ s }: { s: StatusDto }) {
  const total = s.viewCount + s.notViewedCount;
  const viewedDeg = total ? Math.round((s.viewCount / total) * 360) : 0;
  const reactTotal = s.reactions.reduce((a, r) => a + r.count, 0);
  return (
    <aside style={{ width: 308, flexShrink: 0, borderLeft: "1px solid var(--border)", background: "var(--bg-subtle)", overflowY: "auto", padding: "0 14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 4px 12px" }}>
        <div style={{ fontSize: 15.5, fontWeight: 800 }}>Status Details</div>
        <span style={{ cursor: "pointer", color: "var(--text2)", display: "flex" }}>
          <CloseIcon />
        </span>
      </div>
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <Avatar name={s.owner.name} color={s.owner.avatarColor} size={46} fontSize={14} online={s.owner.presence === "ONLINE"}>
            {s.owner.initials}
          </Avatar>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14.5 }}>{s.owner.name}</div>
            {s.owner.presence === "ONLINE" && (
              <div style={{ fontSize: 12, color: "var(--good)", display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--good)" }} />
                Online
              </div>
            )}
          </div>
        </div>
        <div style={{ fontSize: 12.5, color: "var(--text2)", marginTop: 10 }}>
          {relativeTime(s.createdAt)} &nbsp;·&nbsp; Today, {clockTime(s.createdAt)}
        </div>
      </div>
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 13.5 }}>
          <span>Viewers</span>
          <span>{s.viewCount}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 12 }}>
          <div style={{ width: 82, height: 82, borderRadius: "50%", background: `conic-gradient(var(--p600) 0 ${viewedDeg}deg,var(--p200) ${viewedDeg}deg 360deg)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--surface)" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--p600)" }} />
              <b>{s.viewCount}</b>
              <span style={{ color: "var(--text2)" }}>Viewed</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--p200)" }} />
              <b>{s.notViewedCount}</b>
              <span style={{ color: "var(--text2)" }}>Not viewed</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--border2)" }} />
              <b>—</b>
              <span style={{ color: "var(--text2)" }}>Muted</span>
            </div>
          </div>
        </div>
      </div>
      <div style={cardStyle}>
        <div style={{ fontWeight: 800, fontSize: 13.5 }}>Audience</div>
        <div style={{ display: "flex", alignItems: "center", gap: 11, marginTop: 10, cursor: "pointer" }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: "var(--p100)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--p600)" }}>
            <GroupsIcon size={17} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{s.audienceLabel}</div>
            <div style={{ fontSize: 12, color: "var(--text2)" }}>{total} people</div>
          </div>
          <span style={{ color: "var(--text3)" }}>›</span>
        </div>
      </div>
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 13.5 }}>
          <span>Reactions</span>
          <span>{reactTotal}</span>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 11, flexWrap: "wrap" }}>
          {s.reactions.map((r) => (
            <div key={r.emoji} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "var(--muted)", borderRadius: 11, padding: "8px 11px", fontSize: 15 }}>
              {r.emoji}
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text2)" }}>{r.count}</span>
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "var(--muted)", borderRadius: 11, padding: "8px 12px", color: "var(--text2)", fontSize: 16, cursor: "pointer" }}>
            +
          </div>
        </div>
      </div>
      <div style={cardStyle}>
        <div style={{ fontWeight: 800, fontSize: 13.5 }}>Privacy</div>
        <div style={{ display: "flex", gap: 11, marginTop: 10, cursor: "pointer" }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text2)", flexShrink: 0 }}>
            <LockIcon />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>Visible to selected audience</div>
            <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.5, marginTop: 2 }}>Only {s.audienceLabel} members can view this status.</div>
          </div>
          <span style={{ color: "var(--text3)", alignSelf: "center" }}>›</span>
        </div>
      </div>
      <div style={{ ...cardStyle, padding: "6px 14px" }}>
        <div style={{ fontWeight: 800, fontSize: 13.5, padding: "10px 0 4px" }}>Actions</div>
        {[
          { label: `Mute ${s.owner.name.split(" ")[0]}'s updates`, icon: <MuteBellIcon />, border: true },
          { label: "Share status", icon: <ShareIcon />, border: true },
          { label: "Archive status", icon: <ArchiveIcon size={16} />, border: true },
          { label: "Delete status", icon: <TrashIcon />, danger: true },
        ].map((a) => (
          <div
            key={a.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 11,
              padding: "10px 0",
              fontSize: 13,
              fontWeight: a.danger ? 700 : 600,
              cursor: "pointer",
              color: a.danger ? "var(--bad)" : "var(--text)",
              borderBottom: a.border ? "1px solid var(--border)" : "none",
            }}
          >
            <span style={{ color: a.danger ? "var(--bad)" : "var(--text2)", display: "flex" }}>{a.icon}</span>
            {a.label}
          </div>
        ))}
      </div>
    </aside>
  );
}

const cardStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: 14,
  marginTop: 12,
  boxShadow: "var(--shadow)",
};
