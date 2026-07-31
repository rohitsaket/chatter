"use client";
import { SimpleCard, SimpleListShell } from "@/components/simple/SimpleList";
import { listTime } from "@/lib/format";
import { useConversations } from "@/lib/queries";

export default function ArchivedPage() {
  const archived = useConversations(true);
  const items = archived.data ?? [];

  return (
    <SimpleListShell title="Archived" subtitle={`${items.length} archived conversation${items.length === 1 ? "" : "s"}`} action="Sort by: Recent ▾">
      {items.map((c) => (
        <SimpleCard
          key={c.id}
          avatar={c.icon}
          avatarBg={c.avatarColor}
          title={c.name}
          time={listTime(c.updatedAt)}
          body={c.lastMessage ? `Archived · “${c.lastMessage.text}”` : "Archived conversation"}
          href={`/app/chats/${c.slug ?? c.id}`}
        />
      ))}
      {items.length === 0 && !archived.isLoading && (
        <div style={{ color: "var(--text3)", fontSize: 13, padding: 20, textAlign: "center" }}>
          No archived conversations. Archive a chat from its conversation menu.
        </div>
      )}
    </SimpleListShell>
  );
}
