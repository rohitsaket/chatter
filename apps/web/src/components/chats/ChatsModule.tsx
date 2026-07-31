"use client";
import * as React from "react";
import { useConversation, useConversations, useMe } from "@/lib/queries";
import { useUiStore } from "@/lib/store";
import { ChatList } from "./ChatList";
import { ChatThread } from "./ChatThread";
import { DetailPanel } from "./DetailPanel";
import { MobileChatList } from "./MobileChatList";

export function ChatsModule({ slug }: { slug: string | null }) {
  const me = useMe();
  const conversations = useConversations();
  const { detailOpen } = useUiStore();
  const [isMobile, setIsMobile] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 760);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const effectiveSlug = slug ?? (isMobile === false ? (conversations.data?.[0]?.slug ?? conversations.data?.[0]?.id ?? null) : null);
  const conv = useConversation(effectiveSlug);

  if (isMobile === null) return null;

  if (isMobile) {
    if (effectiveSlug && conv.data) {
      return <ChatThread conv={conv.data} mobile />;
    }
    return <MobileChatList conversations={conversations.data ?? []} />;
  }

  return (
    <>
      <ChatList conversations={conversations.data ?? []} selected={effectiveSlug} />
      {conv.data ? (
        <ChatThread conv={conv.data} />
      ) : (
        <main style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-subtle)", color: "var(--text3)", fontSize: 13.5 }}>
          {conversations.isLoading || conv.isLoading ? "Loading…" : "Select a conversation"}
        </main>
      )}
      {conv.data && detailOpen && <DetailPanel conv={conv.data} selfName={me.data?.name ?? ""} />}
    </>
  );
}
