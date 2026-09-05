"use client";
import { useRouter } from "next/navigation";
import * as React from "react";
import type { ConversationDto, FileDto, MessageDto } from "@chatter/contracts";
import { Avatar } from "@chatter/ui";
import { useQueryClient } from "@tanstack/react-query";
import { api, API_URL } from "@/lib/api";
import { clockTime } from "@/lib/format";
import { useJoinCall, useMarkRead, useMe, useMessages, useReact, useSendMessage, useVote } from "@/lib/queries";
import { onTyping, sendTyping } from "@/lib/socket";
import { useUiStore } from "@/lib/store";
import { useE2EE } from "@/lib/e2ee/useE2EE";
import { decryptAttachment, type DecryptedContent, type EncryptedAttachmentMetadata, type SafetyNumber } from "@/lib/e2ee/crypto";
import { DotsMenu, type MenuItem } from "../common/Menu";
import {
  AttachIcon,
  CloseIcon,
  DotsVIcon,
  DoubleCheckIcon,
  SingleCheckIcon,
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
  const me = useMe().data;
  const markRead = useMarkRead();
  const react = useReact();
  const vote = useVote();
  const { setDetailOpen, threadSearch, setThreadSearch } = useUiStore();
  const [draft, setDraft] = React.useState("");
  const [pinHidden, setPinHidden] = React.useState(false);
  const [typers, setTypers] = React.useState<Map<string, string>>(new Map());
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const attachRef = React.useRef<HTMLInputElement>(null);
  const typingTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [decryptedMessages, setDecryptedMessages] = React.useState<Map<string, DecryptedContent>>(new Map());
  const [securityOpen, setSecurityOpen] = React.useState(false);
  const [safety, setSafety] = React.useState<SafetyNumber[]>([]);
  
  // Initialize E2EE
  const { isReady: e2eeReady, isInitializing: e2eeInitializing, error: e2eeError, syncEpoch, encrypt, decrypt, encryptAttachment, safetyNumbers, trustDevice } = useE2EE();

  // Decrypt messages when they're available and E2EE is ready
  React.useEffect(() => {
    if (!e2eeReady || !decrypt || !messages.data?.items) return;

    const decryptNewMessages = async () => {
      const newDecrypted = new Map(decryptedMessages);
      let changed = false;

      for (const msg of messages.data.items) {
        // Skip messages we've already decrypted
        if (newDecrypted.has(msg.id)) continue;

        if (msg.encryption) {
          try {
            newDecrypted.set(msg.id, await decrypt(msg));
            changed = true;
          } catch (err) {
            console.warn(`Failed to decrypt message ${msg.id}`, err);
            // A room event may beat its Olm-encrypted room key over separate
            // transports. Leave it pending and retry after the next key sync.
          }
        }
      }

      if (changed) {
        setDecryptedMessages(newDecrypted);
      }
    };

    void decryptNewMessages();
  }, [messages.data?.items, e2eeReady, decrypt, decryptedMessages, syncEpoch]);

  const qc = useQueryClient();
  const join = useJoinCall();
  const [notice, setNotice] = React.useState<string | null>(null);
  const key = conv.slug ?? conv.id;
  const other = conv.participants?.find((p) => p.userId !== me?.id);
  const recipientIds = React.useMemo(
    () => conv.participants?.map((participant) => participant.userId).filter((id) => id !== me?.id) ?? [],
    [conv.participants, me?.id],
  );

  React.useEffect(() => {
    const saved = sessionStorage.getItem(`chatter-draft:${key}`);
    if (saved) {
      setDraft(saved);
      sessionStorage.removeItem(`chatter-draft:${key}`);
    }
  }, [key]);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["conversations"] });
    void qc.invalidateQueries({ queryKey: ["conversation"] });
    void qc.invalidateQueries({ queryKey: ["messages"] });
  };

  /** Calls are never simulated — surface the server's reason when unconfigured. */
  async function startCall() {
    setNotice(null);
    try {
      const res = await join.mutateAsync(key);
      if (!res.configured) {
        setNotice(res.reason ?? "Calls are not configured on this server.");
        return;
      }
      router.push("/app/calls");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not start the call.");
    }
  }

  /** Download the visible history as a plain-text transcript. */
  function exportChat() {
    const lines = allItems.map(
      (m) => `[${new Date(m.createdAt).toLocaleString()}] ${m.senderName}: ${decryptedMessages.get(m.id)?.body ?? m.text ?? "(encrypted attachment)"}`,
    );
    const blob = new Blob([`Chat with ${conv.name}\n\n${lines.join("\n")}\n`], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chatter-${conv.name.replace(/[^\w.-]/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const mute = (minutes: number | null) =>
    api(`/conversations/${key}/mute`, { method: "POST", json: { minutes } }).then(refresh);

  const menuItems: MenuItem[] = [
    { label: "Contact info", onClick: () => setDetailOpen(true) },
    { label: "Search", onClick: () => setThreadSearch(threadSearch === null ? "" : null) },
    {
      label: "Select messages",
      disabled: true,
      disabledReason: "Multi-select is not built yet — no bulk message actions exist server-side.",
    },
    conv.muted
      ? { label: "Unmute notifications", onClick: () => void mute(0) }
      : {
          label: "Mute notifications",
          submenu: [
            { label: "For 8 hours", onClick: () => void mute(8 * 60) },
            { label: "For 1 week", onClick: () => void mute(7 * 24 * 60) },
            { label: "Always", onClick: () => void mute(null) },
          ],
        },
    {
      label: "Disappearing messages",
      disabled: true,
      disabledReason: "Per-conversation retention is not implemented.",
    },
    {
      label: conv.favorite ? "Remove from favourites" : "Add to favourites",
      onClick: () => void api(`/conversations/${key}/favorite`, { method: "POST", json: { value: !conv.favorite } }).then(refresh),
    },
    { label: "Add to list", disabled: true, disabledReason: "Chat lists/labels are not implemented." },
    { label: "Export chat", separator: true, onClick: exportChat },
    {
      label: conv.archived ? "Reopen chat" : "Close chat",
      onClick: () => void api(`/conversations/${key}/archive`, { method: "POST", json: { value: !conv.archived } }).then(() => {
        refresh();
        if (!conv.archived) router.push("/app/chats");
      }),
    },
    { label: "Send call link", separator: true, onClick: () => void startCall() },
    { label: "Report", disabled: true, disabledReason: "No moderation queue exists to receive reports." },
    ...(other
      ? [{
          label: "Block",
          onClick: () => void api(`/contacts/${other.userId}/block`, { method: "POST" }).then(() => {
            void qc.invalidateQueries({ queryKey: ["contacts"] });
            refresh();
          }),
        } as MenuItem]
      : []),
    {
      label: "Clear chat",
      separator: true,
      danger: true,
      onClick: () => {
        if (!window.confirm("Clear this chat? Messages are removed for you only — the other person keeps their copy.")) return;
        void api(`/conversations/${key}/clear`, { method: "POST" }).then(refresh);
      },
    },
    {
      label: "Delete chat",
      danger: true,
      onClick: () => {
        if (!window.confirm("Delete this chat? It is removed from your list until a new message arrives. The other person is unaffected.")) return;
        void api(`/conversations/${key}`, { method: "DELETE" }).then(() => {
          refresh();
          router.push("/app/chats");
        });
      },
    },
  ];

  const allItems = React.useMemo(() => messages.data?.items ?? [], [messages.data]);
  const items = React.useMemo(
    () => (threadSearch ? allItems.filter((m) => (decryptedMessages.get(m.id)?.body ?? m.text ?? "").toLowerCase().includes(threadSearch.toLowerCase())) : allItems),
    [allItems, decryptedMessages, threadSearch],
  );

  React.useEffect(() => {
    setPinHidden(false);
    setThreadSearch(null);
    // (store setter identity is stable; deps intentionally limited)
  }, [conv.id]);

  React.useEffect(() => {
    if (conv.unreadCount > 0) markRead.mutate(conv.slug ?? conv.id);
    // (deps intentionally limited)
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

  async function doSend() {
    const text = draft.trim();
    if (!text) return;
    sendTyping(conv.id, false);
    setNotice(null);
    try {
      if (!e2eeReady) throw new Error(e2eeInitializing ? "Encryption is still starting. Your message was not sent." : (e2eeError ?? "Encryption is unavailable."));
      const encryptedEnvelope = await encrypt(conv.id, recipientIds, { kind: "chatter.message", body: text });
      await send.mutateAsync({ encryptedEnvelope });
      setDraft("");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Encryption failed. Your message was not sent.");
    }
  }

  async function toggleSecurity() {
    const next = !securityOpen;
    setSecurityOpen(next);
    if (!next) return;
    try {
      setSafety(await safetyNumbers(recipientIds));
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Could not load device fingerprints");
    }
  }

  async function changeTrust(device: SafetyNumber, trust: "verified" | "blocked" | "unset") {
    if (trust === "verified" && !window.confirm("Only verify after comparing this fingerprint with your contact over a separate trusted channel. Continue?")) return;
    if (trust === "blocked" && !window.confirm("Block this device from receiving future room keys?")) return;
    try {
      await trustDevice(device.userId, device.deviceId, trust);
      setSafety(await safetyNumbers(recipientIds));
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Could not update device trust");
    }
  }

  async function handleAttach(file: File) {
    setNotice(null);
    try {
      if (!e2eeReady) throw new Error("Encryption must be ready before attaching a file.");
      const encryptedFile = await encryptAttachment(file);
      const csrf = document.cookie.match(/(?:^|;\s*)chatter_csrf=([^;]+)/)?.[1] ?? "";
      const uploadBody = encryptedFile.bytes.buffer.slice(
        encryptedFile.bytes.byteOffset,
        encryptedFile.bytes.byteOffset + encryptedFile.bytes.byteLength,
      ) as ArrayBuffer;
      const res = await fetch(`${API_URL}/api/v1/files/upload`, {
        method: "POST",
        credentials: "include",
        headers: {
          "x-file-name": "encrypted.bin",
          "x-chatter-encrypted": "1",
          "content-type": "application/octet-stream",
          "x-csrf-token": csrf,
        },
        body: uploadBody,
      });
      if (!res.ok) throw new Error("Encrypted attachment upload failed");
      const uploaded = await res.json() as FileDto;
      const encryptedEnvelope = await encrypt(conv.id, recipientIds, {
        kind: "chatter.message",
        body: "",
        attachments: [{
          fileId: uploaded.id,
          name: file.name,
          mime: file.type || "application/octet-stream",
          sizeBytes: file.size,
          mediaEncryptionInfo: encryptedFile.mediaEncryptionInfo,
        }],
      });
      await send.mutateAsync({ encryptedEnvelope, attachmentIds: [uploaded.id] });
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "The encrypted attachment was not sent.");
    }
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
          <div style={{ display: "flex", gap: 4, color: "var(--text2)", alignItems: "center" }}>
            {threadSearch !== null && (
              <input
                autoFocus
                value={threadSearch}
                onChange={(e) => setThreadSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setThreadSearch(null)}
                placeholder="Search in conversation..."
                style={{ border: "1px solid var(--border)", borderRadius: 9, padding: "7px 11px", font: "inherit", fontSize: 12.5, color: "var(--text)", background: "var(--muted)", outline: "none", width: 190 }}
              />
            )}
            <button type="button" onClick={() => void toggleSecurity()} title="End-to-end encryption and device fingerprints" style={{ width: 36, height: 36, border: "none", borderRadius: 10, background: securityOpen ? "var(--sel)" : "transparent", color: e2eeReady ? "var(--good)" : "var(--warn)", cursor: "pointer" }}>
              {e2eeReady ? "🔒" : "⚠"}
            </button>
            {[
              { icon: <SearchIcon size={17} />, key: "search", onClick: () => setThreadSearch(threadSearch === null ? "" : null) },
              { icon: <PhoneIcon size={17} strokeWidth={1.7} />, key: "phone", onClick: () => void startCall() },
              { icon: <VideoIcon />, key: "video", onClick: () => void startCall() },
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
            <DotsMenu size={36} trigger={<DotsVIcon />} triggerStyle={{ borderRadius: 10 }} items={menuItems} />
          </div>
        </header>
      )}
      {securityOpen && !mobile && (
        <div style={{ margin: "10px 18px 0", padding: 13, border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface)", boxShadow: "var(--shadow)" }}>
          <div style={{ fontSize: 13, fontWeight: 800 }}>End-to-end encrypted · Olm/Megolm v1</div>
          <div style={{ fontSize: 11.5, color: "var(--text2)", marginTop: 3 }}>Compare each fingerprint out-of-band. A new unverified device is visible here and is never silently marked trusted.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
            {safety.map((device) => (
              <div key={`${device.userId}:${device.deviceId}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: 9, borderRadius: 9, background: "var(--muted)" }}>
                <span style={{ color: device.blacklisted ? "var(--danger)" : device.verified ? "var(--good)" : "var(--warn)" }}>{device.blacklisted ? "●" : device.verified ? "✓" : "!"}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 12.5, fontWeight: 700 }}>{device.displayName} · {device.deviceId.slice(0, 8)}</span>
                  <code style={{ display: "block", marginTop: 3, fontSize: 10.5, color: "var(--text2)", overflowWrap: "anywhere" }}>{device.fingerprint}</code>
                </span>
                {device.verified ? (
                  <button type="button" onClick={() => void changeTrust(device, "unset")} style={{ border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg)", padding: "6px 9px", cursor: "pointer" }}>Unverify</button>
                ) : (
                  <button type="button" onClick={() => void changeTrust(device, "verified")} style={{ border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg)", padding: "6px 9px", cursor: "pointer" }}>Verify</button>
                )}
                <button type="button" onClick={() => void changeTrust(device, device.blacklisted ? "unset" : "blocked")} style={{ border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg)", color: device.blacklisted ? "var(--text)" : "var(--danger)", padding: "6px 9px", cursor: "pointer" }}>{device.blacklisted ? "Unblock" : "Block"}</button>
              </div>
            ))}
            {!safety.length && <div style={{ fontSize: 12, color: "var(--text3)" }}>No published recipient devices yet. Sending remains disabled until key setup succeeds.</div>}
          </div>
        </div>
      )}
      {notice && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "12px 18px 0", padding: "10px 13px", borderRadius: 11, background: "var(--muted)", border: "1px solid var(--warn)", fontSize: 12.5, color: "var(--text)" }}>
          <span style={{ flex: 1 }}>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text2)", display: "flex" }}>
            <CloseIcon />
          </button>
        </div>
      )}
      {showPin && !mobile && (
        <div style={{ display: "flex", alignItems: "center", gap: 11, margin: "12px 18px 0", padding: "10px 14px", borderRadius: 12, background: "var(--sel)", border: "1px solid var(--p200)" }}>
          <PinIcon />
          <div style={{ flex: 1, fontSize: 13 }}>
            <span style={{ color: "var(--text2)" }}>Pinned by </span>
            <span style={{ color: "var(--accent-text)", fontWeight: 700 }}>{conv.pinnedMessage!.authorName}</span>
            <div style={{ marginTop: 1, color: "var(--text)" }}>{conv.pinnedMessage!.text}</div>
          </div>
          <div
            onClick={() => document.getElementById(`msg-${conv.pinnedMessage!.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}
            style={{ fontSize: 13, fontWeight: 700, color: "var(--accent-text)", background: "var(--bg)", border: "1px solid var(--p200)", borderRadius: 9, padding: "6px 14px", cursor: "pointer" }}
          >
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
            decryptedContent={decryptedMessages.get(m.id)}
          />
        ))}
        {messages.isLoading && <div style={{ color: "var(--text3)", fontSize: 12.5, textAlign: "center", padding: 20 }}>Loading messages…</div>}
      </div>
      <div style={{ padding: mobile ? "10px 12px" : "12px 18px 16px", display: "flex", alignItems: "center", gap: 10, borderTop: mobile ? "1px solid var(--border)" : "none", background: mobile ? "var(--bg)" : "transparent" }}>
        {!mobile && (
          <>
            <input
              ref={attachRef}
              type="file"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleAttach(f);
                e.target.value = "";
              }}
            />
            <div
              className="hoverable"
              onClick={() => attachRef.current?.click()}
              style={{ width: 42, height: 42, borderRadius: 12, background: "var(--bg)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text2)", cursor: "pointer", flexShrink: 0 }}
            >
              <AttachIcon />
            </div>
          </>
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
            <span onClick={() => handleDraft(draft + "🙂")} style={{ color: "var(--text3)", cursor: "pointer", display: "flex" }}>
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
  decryptedContent,
}: {
  m: MessageDto;
  prev?: MessageDto;
  isGroup: boolean;
  mobile?: boolean;
  onReact: (emoji: string) => void;
  onVote: (optionId: string) => void;
  decryptedContent?: DecryptedContent;
}) {
  const displayText = decryptedContent?.body ?? m.text ?? (m.encryption ? "Waiting for encryption keys…" : null);
  const encryptedAttachments = decryptedContent?.attachments ?? [];
  const sameSender = prev && prev.senderId === m.senderId && !prev.mine;
  if (m.mine) {
    return (
      <div id={`msg-${m.id}`} style={{ alignSelf: "flex-end", maxWidth: mobile ? "80%" : "62%", display: "flex", flexDirection: "column", alignItems: "flex-end", margin: "3px 0" }}>
        <div style={{ background: "var(--bubble-out)", borderRadius: "14px 14px 4px 14px", padding: "10px 14px", fontSize: 13.5, lineHeight: 1.55, boxShadow: "var(--shadow)" }}>
          {displayText}
          {encryptedAttachments.map((attachment) => <EncryptedAttachmentCard key={attachment.fileId} attachment={attachment} />)}
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 5, marginTop: 3, fontSize: 11, color: "var(--text3)" }}>
            {clockTime(m.createdAt)} <MessageTicks state={m.state} />
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
                <span style={{ fontSize: 13, fontWeight: 800, color: "var(--accent-text)" }}>{m.senderName}</span>
                {m.senderRole && (
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--accent-text)", background: "var(--p100)", borderRadius: 99, padding: "2px 8px" }}>
                    {m.senderRole}
                  </span>
                )}
                <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text3)", paddingLeft: 14 }}>{clockTime(m.createdAt)}</span>
              </div>
            )}
            {m.replyTo && (
              <div style={{ borderLeft: "3px solid var(--p500)", background: "var(--muted)", borderRadius: 6, padding: "6px 10px", marginBottom: 6, fontSize: 12, color: "var(--text2)" }}>
                <span style={{ fontWeight: 700, color: "var(--accent-text)" }}>{m.replyTo.senderName}</span> · {m.replyTo.text}
              </div>
            )}
            {displayText && <div style={{ fontSize: 13.5, lineHeight: 1.55 }}>{displayText}</div>}
            {encryptedAttachments.map((attachment) => <EncryptedAttachmentCard key={attachment.fileId} attachment={attachment} />)}
            {!encryptedAttachments.length && (m.attachments ?? []).filter((attachment) => !attachment.encrypted).map((a) => (
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
            {(m.reactions ?? []).map((r) => (
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
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent-text)" }}>Poll by {poll.authorName}</span>
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
      <div style={{ textAlign: "right", fontSize: 12.5, fontWeight: 700, color: "var(--accent-text)", marginTop: 10, cursor: "pointer" }}>
        {poll.myOptionId ? "Vote recorded ✓" : "Tap an option to vote"}
      </div>
    </div>
  );
}

/**
 * Delivery ticks for a message the signed-in user sent.
 *
 * One tick per distinct server-confirmed fact, never inferred from the
 * recipient's presence:
 *
 *   SENT      ✓   accepted and persisted by the server
 *   DELIVERED ✓✓  recipient's client acknowledged receipt
 *   READ      ✓✓  recipient opened the conversation (accent colour)
 *
 * The state comes from the server on every render; the client never advances it
 * locally, so a tick can only ever reflect an acknowledgement that really
 * happened. Colour alone does not carry the meaning — each state also has a
 * text label for assistive technology.
 */
function MessageTicks({ state }: { state: string }) {
  const label = state === "READ" ? "Read" : state === "DELIVERED" ? "Delivered" : "Sent";
  return (
    <span role="img" aria-label={label} title={label} style={{ display: "inline-flex", verticalAlign: "middle" }}>
      {state === "SENT" ? <SingleCheckIcon /> : <DoubleCheckIcon read={state === "READ"} />}
    </span>
  );
}

function EncryptedAttachmentCard({ attachment }: { attachment: EncryptedAttachmentMetadata }) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function download() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/v1/files/${attachment.fileId}/download`, { credentials: "include" });
      if (!response.ok) throw new Error("Download failed");
      const clear = await decryptAttachment(new Uint8Array(await response.arrayBuffer()), attachment.mediaEncryptionInfo);
      const clearBuffer = clear.buffer.slice(clear.byteOffset, clear.byteOffset + clear.byteLength) as ArrayBuffer;
      const url = URL.createObjectURL(new Blob([clearBuffer], { type: attachment.mime }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = attachment.name;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not decrypt attachment");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={() => void download()} disabled={busy} style={{ display: "flex", width: "100%", alignItems: "center", gap: 10, background: "var(--muted)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 11, padding: "9px 12px", marginTop: 7, cursor: busy ? "wait" : "pointer", textAlign: "left" }}>
      <span style={{ width: 36, height: 36, borderRadius: 9, background: "var(--p600)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, fontWeight: 800 }}>ENC</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis" }}>{attachment.name}</span>
        <span style={{ display: "block", fontSize: 11.5, color: error ? "var(--danger)" : "var(--text3)" }}>{error ?? `${(attachment.sizeBytes / 1024 / 1024).toFixed(1)} MB · encrypted`}</span>
      </span>
    </button>
  );
}
