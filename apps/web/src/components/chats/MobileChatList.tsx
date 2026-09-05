"use client";
import { useRouter } from "next/navigation";
import type { ConversationDto } from "@chatter/contracts";
import { Avatar } from "@chatter/ui";
import { listTime } from "@/lib/format";

export function MobileChatList({ conversations }: { conversations: ConversationDto[] }) {
  const router = useRouter();
  return (
    <div style={{ padding: 8 }}>
      {conversations.map((c) => (
        <div
          key={c.id}
          className="hoverable"
          onClick={() => router.push(`/app/chats/${c.slug ?? c.id}`)}
          style={{ display: "flex", gap: 12, padding: "12px 10px", borderRadius: 12, cursor: "pointer" }}
        >
          <Avatar name={c.name} color={c.avatarColor} size={48} fontSize={15} online={c.online}>
            {c.icon}
          </Avatar>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ flex: 1, fontWeight: 700, fontSize: 14.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</span>
              <span style={{ fontSize: 11, color: c.unreadCount ? "var(--accent-text)" : "var(--text3)", fontWeight: 600 }}>
                {c.lastMessage ? listTime(c.lastMessage.at) : listTime(c.updatedAt)}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
              <span style={{ flex: 1, fontSize: 13, color: "var(--text2)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {c.lastMessage ? `${c.lastMessage.senderIsSelf ? "You: " : ""}${c.lastMessage.text}` : "No messages yet"}
              </span>
              {c.unreadCount > 0 && (
                <span style={{ background: "var(--p600)", color: "#fff", fontSize: 10.5, fontWeight: 700, borderRadius: 99, padding: "2px 7px" }}>
                  {c.unreadCount}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
