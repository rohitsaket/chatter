"use client";
import { SimpleCard, SimpleListShell } from "@/components/simple/SimpleList";
import { formatBytes, listTime } from "@/lib/format";
import { useConversations, useFiles } from "@/lib/queries";

export default function StarredPage() {
  const files = useFiles();
  const conversations = useConversations();
  const starredFiles = (files.data ?? []).filter((f) => f.starred);
  const favoriteConvs = (conversations.data ?? []).filter((c) => c.favorite);
  const total = starredFiles.length + favoriteConvs.length;

  return (
    <SimpleListShell title="Starred" subtitle={`${total} starred conversations and files`} action="Sort by: Recent ▾">
      {favoriteConvs.map((c) => (
        <SimpleCard
          key={c.id}
          avatar={c.icon}
          avatarBg={c.avatarColor}
          title={c.name}
          time={c.lastMessage ? listTime(c.lastMessage.at) : listTime(c.updatedAt)}
          body={c.lastMessage ? `“${c.lastMessage.text}”` : "Starred conversation"}
          href={`/app/chats/${c.slug ?? c.id}`}
        />
      ))}
      {starredFiles.map((f) => (
        <SimpleCard
          key={f.id}
          avatar="📄"
          avatarBg="#ef4457"
          title={f.name}
          time={listTime(f.updatedAt)}
          body={`Starred file · ${formatBytes(f.sizeBytes)}${f.sharedIn ? ` · ${f.sharedIn}` : ""}`}
          href="/app/files"
        />
      ))}
      {total === 0 && <div style={{ color: "var(--text3)", fontSize: 13, padding: 20, textAlign: "center" }}>Nothing starred yet.</div>}
    </SimpleListShell>
  );
}
