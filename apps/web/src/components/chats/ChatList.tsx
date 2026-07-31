"use client";
import { useRouter } from "next/navigation";
import * as React from "react";
import type { ConversationDto } from "@chatter/contracts";
import { Avatar } from "@chatter/ui";
import { listTime } from "@/lib/format";
import { useUiStore } from "@/lib/store";
import { FilterIcon, SearchIcon } from "../icons";

export function ChatList({ conversations, selected }: { conversations: ConversationDto[]; selected: string | null }) {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const { chatTab, setChatTab } = useUiStore();

  const totalUnread = conversations.filter((c) => c.unreadCount > 0).length;
  const filtered = conversations
    .filter((c) => (chatTab === "Unread" ? c.unreadCount > 0 : chatTab === "Favorites" ? c.favorite : true))
    .filter((c) => !q || `${c.name} ${c.lastMessage?.text ?? ""}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div style={{ width: 300, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: "1px solid var(--border)", background: "var(--bg)" }}>
      <div style={{ padding: "14px 14px 0", display: "flex", gap: 8 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: "var(--muted)", borderRadius: 11, padding: "9px 12px", color: "var(--text3)" }}>
          <SearchIcon />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search chats, contacts..."
            style={{ border: "none", outline: "none", background: "transparent", font: "inherit", fontSize: 13, color: "var(--text)", width: "100%" }}
          />
        </div>
        <div
          className="hoverable"
          style={{ width: 38, height: 38, borderRadius: 11, border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text2)", cursor: "pointer" }}
        >
          <FilterIcon />
        </div>
      </div>
      <div style={{ display: "flex", gap: 18, padding: "12px 18px 0", borderBottom: "1px solid var(--border)", fontSize: 13.5, fontWeight: 600, color: "var(--text2)" }}>
        {(["All", "Unread", "Favorites"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setChatTab(tab)}
            style={{
              paddingBottom: 9,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: chatTab === tab ? "var(--p600)" : "var(--text2)",
              borderBottom: `2px solid ${chatTab === tab ? "var(--p600)" : "transparent"}`,
              background: "none",
              border: "none",
              borderRadius: 0,
              font: "inherit",
              fontWeight: 600,
            }}
          >
            {tab}
            {tab === "Unread" && totalUnread > 0 && (
              <span style={{ background: "var(--p600)", color: "#fff", fontSize: 10.5, fontWeight: 700, borderRadius: 99, padding: "1px 6px" }}>
                {totalUnread}
              </span>
            )}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "6px 8px" }}>
        {filtered.map((c) => {
          const isSel = c.slug === selected || c.id === selected;
          const typing = c.typing.length > 0;
          return (
            <div
              key={c.id}
              className={isSel ? undefined : "hoverable"}
              onClick={() => router.push(`/app/chats/${c.slug ?? c.id}`)}
              style={{ display: "flex", gap: 11, padding: 10, borderRadius: 12, cursor: "pointer", background: isSel ? "var(--sel)" : "transparent" }}
            >
              <Avatar name={c.name} color={c.avatarColor} size={44} fontSize={14} online={c.online}>
                {c.icon}
              </Avatar>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ flex: 1, fontWeight: 700, fontSize: 13.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</span>
                  <span style={{ fontSize: 11, color: c.unreadCount ? "var(--p600)" : "var(--text3)", fontWeight: 600, flexShrink: 0 }}>
                    {c.lastMessage ? listTime(c.lastMessage.at) : listTime(c.updatedAt)}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
                  <span
                    style={{
                      flex: 1,
                      fontSize: 12.5,
                      color: typing ? "var(--p600)" : "var(--text2)",
                      fontStyle: typing ? "italic" : "normal",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {typing
                      ? "Typing..."
                      : c.lastMessage
                        ? `${c.lastMessage.senderIsSelf ? "You: " : c.kind === "GROUP" ? `${c.lastMessage.senderName}: ` : ""}${c.lastMessage.text}`
                        : "No messages yet"}
                  </span>
                  {c.unreadCount > 0 && (
                    <span style={{ background: "var(--p600)", color: "#fff", fontSize: 10.5, fontWeight: 700, borderRadius: 99, padding: "2px 6.5px", flexShrink: 0 }}>
                      {c.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ padding: "30px 16px", textAlign: "center", color: "var(--text3)", fontSize: 12.5 }}>No conversations match.</div>
        )}
      </div>
    </div>
  );
}
