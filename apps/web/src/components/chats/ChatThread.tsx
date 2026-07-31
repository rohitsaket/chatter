"use client";
import { useRouter } from "next/navigation";
import * as React from "react";
import type { ConversationDto, MessageDto } from "@chatter/contracts";
import { Avatar } from "@chatter/ui";
import { clockTime } from "@/lib/format";
import { useMarkRead, useMessages, useReact, useSendMessage, useVote } from "@/lib/queries";
import { onTyping, sendTyping } from "@/lib/socket";
import { useUiStore } from "@/lib/store";
import {
  AttachIcon,
  CloseIcon,
  DotsVIcon,
  DoubleCheckIcon,
  EmojiIcon,
  PhoneIcon,
  PinIcon,
  PollBarsIcon,
  SearchIcon,
  SendIcon,
  VideoIcon,
} from "../icons";

export function ChatThread({ conv, mobile }: { conv: ConversationDto; mobile?: boolean }) {
  const router = useRouter();
  const messages = useMessages(conv.slug ?? conv.id);
  const send = useSendMessage(conv.slug ?? conv.id);
  const markRead = useMarkRead();
  const react = useReact();
  const vote = useVote();
  const { detailOpen, setDetailOpen } = useUiStore();
  const [draft, setDraft] = React.useState("");
  const [pinHidden, setPinHidden] = React.useState(false);
  const [typers, setTypers] = React.useState<Map<string, string>>(new Map());
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const typingTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const items = React.useMemo(() => messages.data?.items ?? [], [messages.data]);

  React.useEffect(() => {
    setPinHidden(false);
  }, [conv.id]);

  React.useEffect(() => {
    if (conv.unreadCount > 0) markRead.mutate(conv.slug ?? conv.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conv.id, conv.unreadCount]);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [items.length, conv.id]);

  React.useEffect(() => {
    return onTyping((p, started) => {
      if (p.conversationId !== conv.id) return;
      setTypers((prev) => {
        const next = new Map(prev);
        if (started) next.set(p.userId, p.name);
        else next.delete(p.userId);
        return next;
      });
    });
  }, [conv.id]);

  function handleDraft(v: string) {
    setDraft(v);
    sendTyping(conv.id, true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => sendTyping(conv.id, false), 1800);
  }

  function doSend() {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    sendTyping(conv.id, false);
    send.mutate({ text });
  }

  const showPin = conv.pinnedMessage && !pinHidden;
  const typingNames = [...typers.values()];

  const thread = (
    <>
      {!mobile && (
        <header style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 18px", borderBottom: "1px solid var(--border)", background: "var(--bg)" }}>
          <Avatar name={conv.name} color={conv.avatarColor} size={42} fontSize={14} online={conv.online}>
            {conv.icon}
          </Avatar>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 15.5 }}>{conv.name}</div>
            <div style={{ fontSize: 12.5, color: "var(--text2)" }}>
              {typingNames.length ? `${typingNames.join(", ")} typing…` : conv.subtitle}
            </div>
          </div>
          <div style={{ display: "flex", gap: 4, color: "var(--text2)" }}>
            {[
              { icon: <SearchIcon size={17} />, key: "search" },
              { icon: <PhoneIcon size={17} strokeWidth={1.7} />, key: "phone" },
              { icon: <VideoIcon />, key: "video", onClick: () => router.push("/app/calls") },
              { icon: <DotsVIcon />, key: "more", onClick: () => setDetailOpen(!detailOpen) },
            ].map((b) => (
              <div
                key={b.key}
                className="hoverable"
                onClick={b.onClick}
                style={{ width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
              >
                {b.icon}
              </div>
            ))}
          </div>
        </header>
      )}
      {showPin && !mobile && (
        <div style={{ display: "flex", alignItems: "center", gap: 11, margin: "12px 18px 0", padding: "10px 14px", borderRadius: 12, background: "var(--sel)", border: "1px solid var(--p200)" }}>
          <PinIcon />
          <div style={{ flex: 1, fontSize: 13 }}>
            <span style={{ color: "var(--text2)" }}>Pinned by </span>
            <span style={{ color: "var(--p600)", fontWeight: 700 }}>{conv.pinnedMessage!.authorName}</span>
            <div style={{ marginTop: 1, color: "var(--text)" }}>{conv.pinnedMessage!.text}</div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--p600)", background: "var(--bg)", border: "1px solid var(--p200)", borderRadius: 9, padding: "6px 14px", cursor: "pointer" }}>
            View
          </div>
          <span onClick={() => setPinHidden(true)} style={{ cursor: "pointer", color: "var(--text3)", display: "flex" }}>
            <CloseIcon size={15} />
          </span>
        </div>
      )}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: mobile ? "14px 12px" : "16px 18px 8px", display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ alignSelf: "center", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 99, padding: "4px 14px", fontSize: 12, fontWeight: 600, color: "var(--text2)", marginBottom: 10 }}>
          Today
        </div>
        {items.map((m, i) => (
          <MessageRow
            key={m.id}
            m={m}
            prev={items[i - 1]}
            isGroup={conv.kind === "GROUP"}
            mobile={mobile}
            onReact={(emoji) => react.mutate({ messageId: m.id, emoji })}
            onVote={(optionId) => vote.mutate({ messageId: m.id, optionId })}
          />
        ))}
        {messages.isLoading && <div style={{ color: "var(--text3)", fontSize: 12.5, textAlign: "center", padding: 20 }}>Loading messages…</div>}
      </div>
      <div style={{ padding: mobile ? "10px 12px" : "12px 18px 16px", display: "flex", alignItems: "center", gap: 10, borderTop: mobile ? "1px solid var(--border)" : "none", background: mobile ? "var(--bg)" : "transparent" }}>
        {!mobile && (
          <div
            className="hoverable"
            style={{ width: 42, height: 42, borderRadius: 12, background: "var(--bg)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text2)", cursor: "pointer", flexShrink: 0 }}
          >
            <AttachIcon />
          </div>
        )}
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: mobile ? "var(--muted)" : "var(--bg)", border: mobile ? "none" : "1px solid var(--border)", borderRadius: 12, padding: "4px 6px 4px 16px" }}>
          <input
            value={draft}
            onChange={(e) => handleDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                doSend();
              }
            }}
            placeholder="Type a message..."
            style={{ flex: 1, border: "none", outline: "none", background: "transparent", font: "inherit", fontSize: 13.5, color: "var(--text)", padding: "8px 0" }}
          />
          {!mobile && (
            <span style={{ color: "var(--text3)", cursor: "pointer", display: "flex" }}>
              <EmojiIcon />
            </span>
          )}
          <div
            className="hover-p700"
            onClick={doSend}
            style={{ width: 38, height: 38, borderRadius: 10, background: "var(--p600)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
          >
            <SendIcon />
          </div>
        </div>
      </div>
    </>
  );

  return (
    <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: "var(--bg-subtle)", height: mobile ? "100%" : undefined }}>
      {thread}
    </main>
  );
}

function MessageRow({
  m,
  prev,
  isGroup,
  mobile,
  onReact,
  onVote,
}: {
  m: MessageDto;
  prev?: MessageDto;
  isGroup: boolean;
  mobile?: boolean;
  onReact: (emoji: string) => void;
  onVote: (optionId: string) => void;
}) {
  const sameSender = prev && prev.senderId === m.senderId && !prev.mine;
  if (m.mine) {
    return (
      <div style={{ alignSelf: "flex-end", maxWidth: mobile ? "80%" : "62%", display: "flex", flexDirection: "column", alignItems: "flex-end", margin: "3px 0" }}>
        <div style={{ background: "var(--bubble-out)", borderRadius: "14px 14px 4px 14px", padding: "10px 14px", fontSize: 13.5, lineHeight: 1.55, boxShadow: "var(--shadow)" }}>
          {m.text}
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 5, marginTop: 3, fontSize: 11, color: "var(--text3)" }}>
            {clockTime(m.createdAt)} <DoubleCheckIcon read={m.state === "READ"} />
          </div>
        </div>
      </div>
    );
  }

  const showAvatar = !sameSender;
  const showName = !sameSender && (isGroup || Boolean(m.poll));

  return (
    <div style={{ alignSelf: "flex-start", maxWidth: mobile ? "86%" : "68%", display: "flex", gap: 9, margin: "3px 0" }}>
      {showAvatar ? (
        <Avatar name={m.senderName} color={m.senderAvatarColor} size={34} fontSize={11.5}>
          {m.senderInitials}
        </Avatar>
      ) : (
        <div style={{ width: 34, flexShrink: 0 }} />
      )}
      <div style={{ minWidth: 0 }}>
        {m.poll ? (
          <PollCard poll={m.poll} onVote={onVote} />
        ) : (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "4px 14px 14px 14px", padding: "10px 14px", boxShadow: "var(--shadow)" }}>
            {showName && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: "var(--p600)" }}>{m.senderName}</span>
                {m.senderRole && (
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--p600)", background: "var(--p100)", borderRadius: 99, padding: "2px 8px" }}>
                    {m.senderRole}
                  </span>
                )}
                <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text3)", paddingLeft: 14 }}>{clockTime(m.createdAt)}</span>
              </div>
            )}
            {m.replyTo && (
              <div style={{ borderLeft: "3px solid var(--p500)", background: "var(--muted)", borderRadius: 6, padding: "6px 10px", marginBottom: 6, fontSize: 12, color: "var(--text2)" }}>
                <span style={{ fontWeight: 700, color: "var(--p600)" }}>{m.replyTo.senderName}</span> · {m.replyTo.text}
              </div>
            )}
            {m.text && <div style={{ fontSize: 13.5, lineHeight: 1.55 }}>{m.text}</div>}
            {m.attachments.map((a) => (
              <div key={a.fileId} style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 11, padding: "9px 12px", marginTop: 6, minWidth: 230 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: "#ef4457", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 9, fontWeight: 800 }}>
                  {a.type}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{a.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text3)" }}>{(a.sizeBytes / 1024 / 1024).toFixed(1)} MB</div>
                </div>
              </div>
            ))}
            {!showName && (
              <div style={{ textAlign: "right", fontSize: 11, color: "var(--text3)", marginTop: 3 }}>{clockTime(m.createdAt)}</div>
            )}
          </div>
        )}
        {m.reactions.length > 0 && (
          <div style={{ display: "flex", gap: 6, marginTop: 5 }}>
            {m.reactions.map((r) => (
              <div
                key={r.emoji}
                className="hover-border"
                onClick={() => onReact(r.emoji)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  background: "var(--surface)",
                  border: `1px solid ${r.mine ? "var(--p300)" : "var(--border)"}`,
                  borderRadius: 99,
                  padding: "3px 9px",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {r.emoji} <span style={{ fontWeight: 700, color: "var(--text2)" }}>{r.count}</span>
              </div>
            ))}
            <div
              onClick={() => onReact("👍")}
              style={{ display: "flex", alignItems: "center", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 99, padding: "3px 8px", fontSize: 12, color: "var(--text3)", cursor: "pointer" }}
            >
              ☺
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PollCard({ poll, onVote }: { poll: NonNullable<MessageDto["poll"]>; onVote: (optionId: string) => void }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "12px 14px", marginTop: 4, minWidth: 320, boxShadow: "var(--shadow)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--p600)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <PollBarsIcon />
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--p600)" }}>Poll by {poll.authorName}</span>
        <span style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--text3)" }}>{poll.totalVotes} votes</span>
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 700, margin: "9px 0 10px" }}>{poll.question}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {poll.options.map((o, i) => {
          const pct = poll.totalVotes ? Math.round((o.votes / poll.totalVotes) * 100) : 0;
          const mine = poll.myOptionId === o.id;
          return (
            <div key={o.id} className="hoverable" onClick={() => onVote(o.id)} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", borderRadius: 9, padding: 2 }}>
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  border: `1.5px solid ${mine ? "var(--p600)" : "var(--border2)"}`,
                  background: mine ? "var(--p600)" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  color: mine ? "#fff" : "var(--text2)",
                  flexShrink: 0,
                }}
              >
                {mine ? "✓" : String.fromCharCode(65 + i)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, fontWeight: 600 }}>
                  <span>{o.label}</span>
                  <span style={{ color: "var(--text2)" }}>
                    {o.votes} ({pct}%)
                  </span>
                </div>
                <div style={{ height: 5, borderRadius: 99, background: "var(--muted)", marginTop: 4 }}>
                  <div style={{ width: `${pct}%`, height: "100%", borderRadius: 99, background: "var(--p500)" }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ textAlign: "right", fontSize: 12.5, fontWeight: 700, color: "var(--p600)", marginTop: 10, cursor: "pointer" }}>
        {poll.myOptionId ? "Vote recorded ✓" : "Tap an option to vote"}
      </div>
    </div>
  );
}
