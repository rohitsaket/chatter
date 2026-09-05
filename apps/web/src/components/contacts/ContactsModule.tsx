"use client";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createExternalContactBody, type ContactDto, type Presence } from "@chatter/contracts";
import { Avatar, PresenceDot, presenceLabel } from "@chatter/ui";
import { api } from "@/lib/api";
import { useContacts, useJoinCall } from "@/lib/queries";
import { DotsMenu } from "../common/Menu";
import { NewContactDialog } from "./NewContactDialog";
import { AddPersonIcon, ChatIcon, CloseIcon, DotsHIcon, DotsVIcon, FilterIcon, PhoneIcon, SearchIcon, VideoIcon } from "../icons";

const GRID = "2.1fr 1.5fr 1.2fr 1fr 1.4fr 100px";
const PAGE_SIZE = 25;

type ContactCat = "All Contacts" | "Favorites" | "Online" | "Blocked" | "External Contacts" | "Organization Directory";
type SortKey = "name" | "title" | "department" | "presence" | "phone";
type SortDir = "asc" | "desc";

/** Presence ordering for the Status column: most-available first. */
const PRESENCE_RANK: Record<Presence, number> = { ONLINE: 0, AWAY: 1, BUSY: 2, OFFLINE: 3 };

const COLUMNS: { key: SortKey; label: string; align?: "right" }[] = [
  { key: "name", label: "Name" },
  { key: "title", label: "Role" },
  { key: "department", label: "Department" },
  { key: "presence", label: "Status" },
  { key: "phone", label: "Phone" },
];

export function ContactsModule() {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const contacts = useContacts(q || undefined);
  const [selId, setSelId] = React.useState<string | null>(null);
  const [detailClosed, setDetailClosed] = React.useState(false);
  const [cat, setCat] = React.useState<ContactCat>("All Contacts");
  const [sortKey, setSortKey] = React.useState<SortKey>("name");
  const [sortDir, setSortDir] = React.useState<SortDir>("asc");
  const [page, setPage] = React.useState(0);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [addOpen, setAddOpen] = React.useState(false);
  const [lookupOpen, setLookupOpen] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState<boolean | null>(null);
  const qc = useQueryClient();
  const join = useJoinCall();

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 760);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Any change to the visible set invalidates the current page index.
  React.useEffect(() => setPage(0), [cat, q, sortKey, sortDir]);

  const all = contacts.data ?? [];
  const visible = cat === "Blocked" ? all.filter((c) => c.blocked) : all.filter((c) => !c.blocked);

  const filtered =
    cat === "Favorites" ? visible.filter((c) => c.favorite)
    : cat === "Online" ? visible.filter((c) => c.presence === "ONLINE")
    : cat === "External Contacts" ? visible.filter((c) => c.external)
    : cat === "Organization Directory" ? visible.filter((c) => !c.external)
    : visible;

  const rows = [...filtered].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    if (sortKey === "presence") return (PRESENCE_RANK[a.presence] - PRESENCE_RANK[b.presence]) * dir;
    const av = (a[sortKey] ?? "") as string;
    const bv = (b[sortKey] ?? "") as string;
    // Blank cells always sort last regardless of direction.
    if (!av && bv) return 1;
    if (av && !bv) return -1;
    return av.localeCompare(bv) * dir;
  });

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const paged = rows.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const sel = detailClosed ? undefined : (paged.find((c) => c.id === selId) ?? paged[0]);

  const refresh = () => void qc.invalidateQueries({ queryKey: ["contacts"] });

  // An external contact's id addresses an external_contacts row, not a user, so
  // every mutation has to be routed by `ct.external` rather than by id alone.
  const toggleFavorite = (ct: ContactDto) =>
    (ct.external
      ? api(`/contacts/external/${ct.id}`, { method: "PATCH", json: { favorite: !ct.favorite } })
      : api(`/contacts/${ct.id}/favorite`, { method: "POST" })
    ).then(refresh);
  const toggleBlock = (ct: ContactDto) =>
    (ct.external
      ? api(`/contacts/external/${ct.id}`, { method: "PATCH", json: { blocked: !ct.blocked } })
      : api(`/contacts/${ct.id}/block`, { method: "POST" })
    ).then(refresh);
  const saveContact = (ct: ContactDto, patch: { notes?: string | null; tags?: string[] }) =>
    api(ct.external ? `/contacts/external/${ct.id}` : `/contacts/${ct.id}`, { method: "PATCH", json: patch }).then(refresh);

  async function deleteExternal(ct: ContactDto) {
    setNotice(null);
    try {
      await api(`/contacts/external/${ct.id}`, { method: "DELETE" });
      if (selId === ct.id) setSelId(null);
      refresh();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not remove that contact.");
    }
  }

  /** Find-or-create the DM with this user (idempotent server-side). */
  const resolveDm = (userId: string) =>
    api<{ slug: string | null; id: string }>("/conversations/dm", { method: "POST", json: { userId } });

  const openDm = useMutation({
    mutationFn: resolveDm,
    onSuccess: (conv) => {
      void qc.invalidateQueries({ queryKey: ["conversations"] });
      router.push(`/app/chats/${conv.slug ?? conv.id}`);
    },
  });

  /**
   * Start a call with a contact: resolve their DM, then ask the server for a
   * join token. When LiveKit is unconfigured the server says so and we surface
   * that reason instead of navigating to a call that cannot happen.
   */
  async function startCall(userId: string) {
    setNotice(null);
    try {
      const conv = await resolveDm(userId);
      const res = await join.mutateAsync(conv.slug ?? conv.id);
      if (!res.configured) {
        setNotice(res.reason ?? "Calls are not configured on this server.");
        return;
      }
      router.push("/app/calls");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not start the call.");
    }
  }

  if (isMobile === null) return null;

  if (isMobile) {
    return (
      <div style={{ padding: 8 }}>
        {rows.map((ct) => {
          const sub = [ct.title, ct.department].filter(Boolean).join(" · ");
          return (
            <div
              key={ct.id}
              className="hoverable"
              onClick={ct.external ? undefined : () => openDm.mutate(ct.id)}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 10px", borderRadius: 12, cursor: ct.external ? "default" : "pointer" }}
            >
              <Avatar name={ct.name} color={ct.avatarColor} size={46} fontSize={14} presenceDot={dotOf(ct)} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{ct.name}</div>
                <div style={{ fontSize: 12, color: "var(--text2)" }}>
                  {sub || (ct.external ? ct.email || ct.phone || "External contact" : presenceLabel(ct.presence))}
                </div>
              </div>
              {/* No account behind an external contact, so no DM to open. */}
              {!ct.external && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    openDm.mutate(ct.id);
                  }}
                  style={{ width: 38, height: 38, borderRadius: 11, background: "var(--p100)", color: "var(--accent-text)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                >
                  <ChatIcon size={16} strokeWidth={1.7} />
                </div>
              )}
            </div>
          );
        })}
        {rows.length === 0 && <div style={{ padding: 24, textAlign: "center", color: "var(--text3)", fontSize: 13 }}>No contacts to show.</div>}
      </div>
    );
  }

  const cats: { name: ContactCat; icon: string; count: number }[] = [
    { name: "All Contacts", icon: "👥", count: all.filter((c) => !c.blocked).length },
    { name: "Favorites", icon: "☆", count: all.filter((c) => c.favorite && !c.blocked).length },
    { name: "Online", icon: "🟢", count: all.filter((c) => c.presence === "ONLINE" && !c.blocked).length },
  ];
  const blockedCount = all.filter((c) => c.blocked).length;

  const sourceRow = (name: ContactCat, icon: string, count?: number) => {
    const active = cat === name;
    return (
      <button
        key={name}
        type="button"
        className={active ? undefined : "hoverable"}
        onClick={() => setCat(name)}
        style={{
          display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", borderRadius: 11, cursor: "pointer",
          fontWeight: 600, fontSize: 13.5, width: "100%", border: "none", font: "inherit", textAlign: "left",
          background: active ? "var(--sel)" : "transparent",
          color: active ? "var(--accent-text)" : "var(--text)",
        }}
      >
        <span style={{ opacity: 0.8 }}>{icon}</span>
        <span style={{ flex: 1 }}>{name}</span>
        {count !== undefined && <span style={{ fontSize: 11.5, fontWeight: 700, color: active ? "var(--accent-text)" : "var(--text2)" }}>{count}</span>}
      </button>
    );
  };

  return (
    <>
      <div style={{ width: 238, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: "1px solid var(--border)", background: "var(--bg)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px 12px" }}>
          <span style={{ fontSize: 16, fontWeight: 800 }}>Contacts</span>
          {/* Two ways to gain a contact: find an existing account by its
              number, or record someone who has no account at all. */}
          <DotsMenu
            size={26}
            trigger={<AddPersonIcon />}
            items={[
              { label: "Search by mobile number", onClick: () => setLookupOpen(true) },
              { label: "Add external contact", onClick: () => setAddOpen(true) },
            ]}
          />
        </div>
        <div style={{ padding: "0 10px", display: "flex", flexDirection: "column", gap: 2 }}>
          {cats.map((cc) => {
            const active = cat === cc.name;
            return (
              <button
                key={cc.name}
                type="button"
                className={active ? undefined : "hoverable"}
                onClick={() => setCat(cc.name)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", borderRadius: 11, cursor: "pointer",
                  fontWeight: 600, fontSize: 13.5, width: "100%", border: "none", font: "inherit", textAlign: "left",
                  background: active ? "var(--sel)" : "transparent", color: active ? "var(--accent-text)" : "var(--text)",
                }}
              >
                <span style={{ opacity: 0.8 }}>{cc.icon}</span>
                <span style={{ flex: 1 }}>{cc.name}</span>
                <span style={{ fontSize: 11.5, fontWeight: 700, borderRadius: 99, padding: "2px 8px", background: active ? "var(--p600)" : "var(--muted)", color: active ? "#fff" : "var(--text2)" }}>{cc.count}</span>
              </button>
            );
          })}
        </div>
        <div style={{ margin: "10px 18px 0", borderTop: "1px solid var(--border)" }} />
        <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 2 }}>
          {sourceRow("Organization Directory", "🏢")}
          {sourceRow("External Contacts", "🌐")}
          {sourceRow("Blocked", "🚫", blockedCount)}
        </div>
      </div>
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: "var(--bg)", borderRight: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px" }}>
          <div style={{ flex: 1, maxWidth: 420, display: "flex", alignItems: "center", gap: 8, background: "var(--muted)", borderRadius: 11, padding: "9px 12px", color: "var(--text3)" }}>
            <SearchIcon />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, role or department..." style={{ border: "none", outline: "none", background: "transparent", font: "inherit", fontSize: 13, color: "var(--text)", width: "100%" }} />
          </div>
          <DotsMenu
            size={38}
            trigger={<FilterIcon />}
            triggerStyle={{ borderRadius: 11, border: "1px solid var(--border)", color: "var(--text2)" }}
            items={[
              { label: "All contacts", onClick: () => setCat("All Contacts") },
              { label: "Online only", onClick: () => setCat("Online") },
              { label: "Favorites only", onClick: () => setCat("Favorites") },
              { label: "Blocked", onClick: () => setCat("Blocked") },
            ]}
          />
          <DotsMenu
            size={0}
            trigger={
              <span style={{ fontSize: 12.5, color: "var(--text2)", cursor: "pointer", userSelect: "none" }}>
                Sort by: <b style={{ color: "var(--text)" }}>{COLUMNS.find((c) => c.key === sortKey)?.label ?? "Name"} {sortDir === "asc" ? "↑" : "↓"}</b> ▾
              </span>
            }
            triggerStyle={{ marginLeft: "auto", width: "auto", height: "auto", border: "none", background: "none" }}
            items={COLUMNS.map((c) => ({
              label: `${c.label} ${sortKey === c.key && sortDir === "asc" ? "↓ (reverse)" : "↑"}`,
              onClick: () => {
                setSortDir(sortKey === c.key && sortDir === "asc" ? "desc" : "asc");
                setSortKey(c.key);
              },
            }))}
          />
        </div>
        {notice && (
          <div style={{ margin: "0 18px 10px", padding: "10px 13px", borderRadius: 11, background: "var(--warn-bg,#fdf3e3)", border: "1px solid var(--warn,#f3a622)", color: "var(--text)", fontSize: 12.5, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ flex: 1 }}>{notice}</span>
            <button type="button" onClick={() => setNotice(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text2)", display: "flex" }} aria-label="Dismiss">
              <CloseIcon />
            </button>
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: GRID, gap: 8, padding: "8px 18px", borderBottom: "1px solid var(--border)", fontSize: 12, fontWeight: 700, color: "var(--text2)" }}>
          {COLUMNS.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => {
                setSortDir(sortKey === c.key && sortDir === "asc" ? "desc" : "asc");
                setSortKey(c.key);
              }}
              title={`Sort by ${c.label}`}
              style={{
                background: "none", border: "none", padding: 0, font: "inherit", fontWeight: 700, cursor: "pointer",
                textAlign: "left", display: "flex", alignItems: "center", gap: 4,
                color: sortKey === c.key ? "var(--accent-text)" : "var(--text2)",
              }}
            >
              {c.label}
              <span style={{ opacity: sortKey === c.key ? 1 : 0.25, fontSize: 10 }}>{sortKey === c.key && sortDir === "desc" ? "↓" : "↑"}</span>
            </button>
          ))}
          <span style={{ textAlign: "right" }}>Actions</span>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {paged.map((ct) => {
            const isSel = sel?.id === ct.id;
            return (
              <div
                key={ct.id}
                className={isSel ? undefined : "hoverable"}
                onClick={() => {
                  setDetailClosed(false);
                  setSelId(ct.id);
                }}
                style={{ display: "grid", gridTemplateColumns: GRID, gap: 8, alignItems: "center", padding: "10px 18px", borderBottom: "1px solid var(--border)", cursor: "pointer", fontSize: 13, background: isSel ? "var(--sel)" : "transparent" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <Avatar name={ct.name} color={ct.avatarColor} size={38} fontSize={12} presenceDot={dotOf(ct)} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {ct.name}
                      {ct.blocked && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: "var(--bad,#ef4457)" }}>BLOCKED</span>}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--text2)", display: "flex", alignItems: "center", gap: 5 }}>
                      {/* An external contact has no account, so it has no
                          presence to report. Showing "Offline" would imply they
                          are signed out rather than absent entirely. */}
                      {ct.external ? (
                        <span>{ct.email || ct.phone || "External"}</span>
                      ) : (
                        <>
                          <PresenceDot presence={ct.presence} size={6} />
                          {presenceLabel(ct.presence)}
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <span style={cellStyle}>{ct.title ?? "—"}</span>
                <span style={cellStyle}>{(ct.external ? ct.company : ct.department) ?? "—"}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text2)", fontSize: 12.5, minWidth: 0, overflow: "hidden" }}>
                  {ct.external ? (
                    <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".04em", padding: "2px 7px", borderRadius: 99, background: "var(--muted)", color: "var(--text2)" }}>EXTERNAL</span>
                  ) : (
                    <>
                      <PresenceDot presence={ct.presence} />
                      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{presenceLabel(ct.presence)}</span>
                    </>
                  )}
                </span>
                <span style={{ ...cellStyle, fontSize: 12.5 }}>{ct.phone ?? "—"}</span>
                <div style={{ display: "flex", gap: 4, justifyContent: "flex-end", color: "var(--text2)" }}>
                  {!ct.external && (
                    <>
                      <div
                        className="hoverable-sel"
                        title="Message"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDm.mutate(ct.id);
                        }}
                        style={{ width: 29, height: 29, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--accent-text)" }}
                      >
                        <ChatIcon size={14} strokeWidth={1.7} />
                      </div>
                      <div
                        className="hoverable-sel"
                        title={`Call ${ct.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          void startCall(ct.id);
                        }}
                        style={{ width: 29, height: 29, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--accent-text)" }}
                      >
                        <PhoneIcon size={13} strokeWidth={1.7} />
                      </div>
                    </>
                  )}
                  <DotsMenu
                    trigger={<DotsVIcon size={14} />}
                    items={[
                      // Messaging and calling need an account; an external
                      // contact has none, so those entries are omitted entirely
                      // rather than shown disabled.
                      ...(ct.external
                        ? []
                        : [
                            { label: "Message", onClick: () => openDm.mutate(ct.id) },
                            { label: `Call ${ct.name.split(" ")[0]}`, onClick: () => void startCall(ct.id) },
                          ]),
                      { label: ct.favorite ? "Remove from favorites" : "Add to favorites", onClick: () => void toggleFavorite(ct) },
                      { label: "View details", onClick: () => { setDetailClosed(false); setSelId(ct.id); } },
                      { label: ct.blocked ? "Unblock" : "Block", danger: !ct.blocked, onClick: () => void toggleBlock(ct) },
                      ...(ct.external
                        ? [{ label: "Delete contact", danger: true, onClick: () => void deleteExternal(ct) }]
                        : []),
                    ]}
                  />
                </div>
              </div>
            );
          })}
          {paged.length === 0 && (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text3)", fontSize: 13, lineHeight: 1.6 }}>
              {cat === "External Contacts"
                ? "No external contacts yet. Use + above to add someone from outside your organization."
                : cat === "Blocked"
                  ? "No blocked contacts. Use the ••• menu on any contact to block them."
                  : cat === "Favorites"
                    ? "No favorites yet. Use the ☆ on a contact to add one."
                    : contacts.isLoading
                      ? "Loading contacts…"
                      : q
                        ? `No contacts match “${q}”.`
                        : "No contacts in your organization directory."}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", fontSize: 12.5, color: "var(--text2)", borderTop: "1px solid var(--border)" }}>
          <span>
            {rows.length === 0
              ? "No contacts"
              : `Showing ${safePage * PAGE_SIZE + 1} to ${safePage * PAGE_SIZE + paged.length} of ${rows.length} contact${rows.length === 1 ? "" : "s"}`}
          </span>
          {pageCount > 1 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <PagerButton label="Previous" disabled={safePage === 0} onClick={() => setPage(safePage - 1)} />
              <span style={{ fontSize: 12 }}>
                Page <b style={{ color: "var(--text)" }}>{safePage + 1}</b> of {pageCount}
              </span>
              <PagerButton label="Next" disabled={safePage >= pageCount - 1} onClick={() => setPage(safePage + 1)} />
            </div>
          )}
        </div>
      </main>
      {sel && (
        <ContactDetail
          key={sel.id}
          ct={sel}
          onMessage={() => openDm.mutate(sel.id)}
          onCall={() => void startCall(sel.id)}
          onFavorite={() => void toggleFavorite(sel)}
          onBlock={() => void toggleBlock(sel)}
          onSave={(patch) => void saveContact(sel, patch)}
          onDelete={sel.external ? () => void deleteExternal(sel) : undefined}
          onClose={() => setDetailClosed(true)}
        />
      )}
      {lookupOpen && <NewContactDialog onClose={() => setLookupOpen(false)} />}
      {addOpen && (
        <AddExternalContactDialog
          onClose={() => setAddOpen(false)}
          onAdded={(created) => {
            setAddOpen(false);
            refresh();
            // Drop the user on the row they just created rather than leaving
            // them to hunt for it in a list of sixteen.
            setCat("External Contacts");
            setDetailClosed(false);
            setSelId(created.id);
          }}
        />
      )}
    </>
  );
}

/**
 * Create an external contact. Field errors come back from the same Zod schema
 * the server enforces, so the messages here match the ones the API would send.
 */
function AddExternalContactDialog({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: (created: ContactDto) => void;
}) {
  const [form, setForm] = React.useState({ name: "", email: "", phone: "", company: "", title: "" });
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((e) => {
      if (!e[key]) return e;
      const { [key as string]: _drop, ...rest } = e;
      return rest;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = createExternalContactBody.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!errs[key]) errs[key] = issue.message;
      }
      setFieldErrors(errs);
      setError("Please correct the highlighted fields.");
      return;
    }

    setBusy(true);
    try {
      const created = await api<ContactDto>("/contacts/external", { method: "POST", json: parsed.data });
      onAdded(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add that contact.");
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-external-title"
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(15,17,24,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 60 }}
    >
      <form
        onSubmit={submit}
        noValidate
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 430, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "22px 22px 18px", boxShadow: "var(--shadow-lg)" }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h2 id="add-external-title" style={{ margin: 0, fontSize: 16.5, fontWeight: 800 }}>Add external contact</h2>
            <p style={{ margin: "5px 0 0", fontSize: 12.5, color: "var(--text2)", lineHeight: 1.5 }}>
              Someone outside your organization. They have no Chatter account, so you cannot message or call them here.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text2)", display: "flex", padding: 2 }}>
            <CloseIcon />
          </button>
        </div>

        <DialogField label="Name" htmlFor="ext-name" error={fieldErrors.name} required>
          <input id="ext-name" value={form.name} onChange={(e) => set("name", e.target.value)} style={dialogInput(Boolean(fieldErrors.name))} {...dialogAria("ext-name", fieldErrors.name)} />
        </DialogField>
        <DialogField label="Email" htmlFor="ext-email" error={fieldErrors.email} hint="Email or phone is required">
          <input id="ext-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} style={dialogInput(Boolean(fieldErrors.email))} {...dialogAria("ext-email", fieldErrors.email, true)} />
        </DialogField>
        <DialogField label="Phone" htmlFor="ext-phone" error={fieldErrors.phone}>
          <input id="ext-phone" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} style={dialogInput(Boolean(fieldErrors.phone))} {...dialogAria("ext-phone", fieldErrors.phone)} />
        </DialogField>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <DialogField label="Company" htmlFor="ext-company" error={fieldErrors.company}>
            <input id="ext-company" value={form.company} onChange={(e) => set("company", e.target.value)} style={dialogInput(Boolean(fieldErrors.company))} {...dialogAria("ext-company", fieldErrors.company)} />
          </DialogField>
          <DialogField label="Role" htmlFor="ext-title" error={fieldErrors.title}>
            <input id="ext-title" value={form.title} onChange={(e) => set("title", e.target.value)} style={dialogInput(Boolean(fieldErrors.title))} {...dialogAria("ext-title", fieldErrors.title)} />
          </DialogField>
        </div>

        {error && (
          <div role="alert" style={{ marginTop: 13, background: "var(--muted)", border: "1px solid var(--bad,#ef4457)", color: "var(--bad,#ef4457)", borderRadius: 10, padding: "8px 11px", fontSize: 12.5 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 9, justifyContent: "flex-end", marginTop: 16 }}>
          <button type="button" onClick={onClose} style={{ border: "1px solid var(--border)", background: "transparent", color: "var(--text)", borderRadius: 10, padding: "9px 15px", font: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Cancel
          </button>
          <button type="submit" disabled={busy} style={{ border: "none", background: "var(--p600)", color: "#fff", borderRadius: 10, padding: "9px 17px", font: "inherit", fontSize: 13, fontWeight: 700, cursor: busy ? "wait" : "pointer", opacity: busy ? 0.7 : 1 }}>
            {busy ? "Adding…" : "Add contact"}
          </button>
        </div>
      </form>
    </div>
  );
}

function dialogAria(id: string, error?: string, hasHint?: boolean) {
  const describedBy = [hasHint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ");
  return { "aria-invalid": error ? true : undefined, "aria-describedby": describedBy || undefined };
}

function DialogField({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginTop: 12 }}>
      <label htmlFor={htmlFor} style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>
        {label}
        {required && <span style={{ color: "var(--bad,#ef4457)" }} aria-hidden="true"> *</span>}
      </label>
      {children}
      {/* Hint and error render together, so the format guidance survives the
          moment the value is rejected. */}
      {hint ? <div id={`${htmlFor}-hint`} style={{ fontSize: 11.5, color: "var(--text3)", marginTop: 4 }}>{hint}</div> : null}
      {error ? <div id={`${htmlFor}-error`} role="alert" style={{ fontSize: 11.5, color: "var(--bad,#ef4457)", marginTop: 4, fontWeight: 600 }}>{error}</div> : null}
    </div>
  );
}

function dialogInput(invalid: boolean): React.CSSProperties {
  return {
    width: "100%",
    borderRadius: 10,
    border: `1px solid ${invalid ? "var(--bad,#ef4457)" : "var(--border)"}`,
    background: "var(--muted)",
    color: "var(--text)",
    font: "inherit",
    fontSize: 13.5,
    padding: "9px 11px",
    outline: "none",
  };
}

function PagerButton({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={disabled ? undefined : "hoverable"}
      style={{
        border: "1px solid var(--border)", borderRadius: 9, padding: "5px 11px", font: "inherit", fontSize: 12,
        fontWeight: 600, background: "transparent", color: disabled ? "var(--text3)" : "var(--text)",
        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
      }}
    >
      {label}
    </button>
  );
}

function dotOf(ct: ContactDto): string {
  return ct.presence === "ONLINE" ? "var(--good)" : ct.presence === "AWAY" ? "var(--warn)" : "var(--border2)";
}

const cellStyle: React.CSSProperties = {
  color: "var(--text2)",
  minWidth: 0,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

function ContactDetail({
  ct,
  onMessage,
  onCall,
  onFavorite,
  onBlock,
  onSave,
  onDelete,
  onClose,
}: {
  ct: ContactDto;
  onMessage: () => void;
  onCall: () => void;
  onFavorite: () => void;
  onBlock: () => void;
  onSave: (patch: { notes?: string | null; tags?: string[] }) => void;
  /** Only supplied for external contacts — directory members cannot be deleted. */
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [notes, setNotes] = React.useState(ct.notes ?? "");
  const [tags, setTags] = React.useState(ct.tags.join(", "));

  function save() {
    onSave({
      notes: notes.trim() === "" ? null : notes.trim(),
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 12),
    });
    setEditing(false);
  }

  return (
    <aside style={{ width: 300, flexShrink: 0, background: "var(--bg)", overflowY: "auto", padding: "0 20px 20px" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "16px 0 4px" }}>
        <button type="button" onClick={onClose} aria-label="Close details" style={{ cursor: "pointer", color: "var(--text2)", display: "flex", background: "none", border: "none", padding: 0 }}>
          <CloseIcon />
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Avatar name={ct.name} color={ct.avatarColor} size={104} fontSize={32} presenceDot={dotOf(ct)} />
        <div style={{ fontSize: 19, fontWeight: 800, marginTop: 12 }}>
          {ct.name}{" "}
          <span
            role="button"
            tabIndex={0}
            title={ct.favorite ? "Remove from favorites" : "Add to favorites"}
            onClick={onFavorite}
            onKeyDown={(e) => e.key === "Enter" && onFavorite()}
            style={{ color: ct.favorite ? "#f3a622" : "var(--text3)", fontSize: 15, cursor: "pointer" }}
          >
            {ct.favorite ? "★" : "☆"}
          </span>
        </div>
        <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 3 }}>{ct.title ?? "—"}</div>
        {ct.blocked && (
          <div style={{ marginTop: 8, fontSize: 11, fontWeight: 700, color: "var(--bad,#ef4457)", background: "var(--muted)", borderRadius: 99, padding: "3px 10px" }}>BLOCKED</div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: ct.external ? "1fr" : "repeat(4,1fr)", gap: 8, width: "100%", marginTop: 16 }}>
          {(ct.external
            ? []
            : [
                { label: "Message", icon: <ChatIcon size={16} strokeWidth={1.7} />, onClick: onMessage },
                { label: "Call", icon: <PhoneIcon size={15} strokeWidth={1.7} />, onClick: onCall },
                { label: "Video", icon: <VideoIcon size={16} />, onClick: onCall },
              ]
          ).map((a) => (
            <button key={a.label} type="button" className="hoverable-sel" onClick={a.onClick} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: "var(--muted)", borderRadius: 12, padding: "11px 4px", cursor: "pointer", color: "var(--accent-text)", border: "none", font: "inherit" }}>
              {a.icon}
              <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--text2)" }}>{a.label}</span>
            </button>
          ))}
          <DotsMenu
            size={0}
            trigger={
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: "var(--muted)", borderRadius: 12, padding: "11px 4px", cursor: "pointer", color: "var(--accent-text)", width: "100%" }}>
                <DotsHIcon size={16} />
                <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--text2)" }}>More</span>
              </div>
            }
            triggerStyle={{ width: "100%", height: "auto", display: "block" }}
            items={[
              { label: ct.favorite ? "Remove from favorites" : "Add to favorites", onClick: onFavorite },
              ...(ct.external ? [] : [{ label: "Message", onClick: onMessage }]),
              { label: editing ? "Cancel editing" : "Edit notes & tags", onClick: () => setEditing((e) => !e) },
              { label: ct.blocked ? "Unblock" : "Block", danger: !ct.blocked, onClick: onBlock },
              ...(ct.external && onDelete ? [{ label: "Delete contact", danger: true, onClick: onDelete }] : []),
            ]}
          />
        </div>
      </div>
      <Section title="About">
        <Row k="Email" v={ct.email || "—"} />
        <Row k="Phone" v={ct.phone ?? "—"} />
        {!ct.external && <Row k="Location" v={ct.location ?? "—"} />}
        {/* Presence belongs to an account; an external contact has none. */}
        <Row k="Status" v={ct.external ? "External contact" : presenceLabel(ct.presence)} />
      </Section>
      <Section title="Organization">
        <Row k={ct.external ? "Company" : "Department"} v={(ct.external ? ct.company : ct.department) ?? "—"} />
        <Row k="Role" v={ct.title ?? "—"} />
      </Section>
      <Section title="Notes & tags">
        {editing ? (
          <div style={{ marginTop: 9, display: "flex", flexDirection: "column", gap: 8 }}>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Private notes about this contact…"
              rows={4}
              style={{ width: "100%", resize: "vertical", borderRadius: 10, border: "1px solid var(--border)", background: "var(--muted)", color: "var(--text)", font: "inherit", fontSize: 12.5, padding: "8px 10px", outline: "none" }}
            />
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Tags, comma separated"
              style={{ width: "100%", borderRadius: 10, border: "1px solid var(--border)", background: "var(--muted)", color: "var(--text)", font: "inherit", fontSize: 12.5, padding: "8px 10px", outline: "none" }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={save} style={{ flex: 1, background: "var(--p600)", color: "#fff", border: "none", borderRadius: 9, padding: "7px 0", font: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Save</button>
              <button type="button" onClick={() => { setEditing(false); setNotes(ct.notes ?? ""); setTags(ct.tags.join(", ")); }} style={{ flex: 1, background: "transparent", color: "var(--text2)", border: "1px solid var(--border)", borderRadius: 9, padding: "7px 0", font: "inherit", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 9 }}>
            <div style={{ fontSize: 12.5, color: ct.notes ? "var(--text2)" : "var(--text3)", lineHeight: 1.6 }}>
              {ct.notes ?? "No notes yet."}
            </div>
            {ct.tags.length > 0 && (
              <div style={{ display: "flex", gap: 7, marginTop: 9, flexWrap: "wrap" }}>
                {ct.tags.map((t) => (
                  <span key={t} style={{ fontSize: 11, fontWeight: 700, color: "var(--accent-text)", background: "var(--p100)", borderRadius: 99, padding: "4px 11px" }}>{t}</span>
                ))}
              </div>
            )}
            <button type="button" onClick={() => setEditing(true)} style={{ marginTop: 10, background: "none", border: "1px solid var(--border)", borderRadius: 9, padding: "5px 11px", font: "inherit", fontSize: 12, fontWeight: 600, color: "var(--text2)", cursor: "pointer" }}>
              {ct.notes || ct.tags.length ? "Edit" : "Add notes & tags"}
            </button>
          </div>
        )}
      </Section>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ borderTop: "1px solid var(--border)", marginTop: 14, paddingTop: 13 }}>
      <div style={{ fontSize: 13.5, fontWeight: 800 }}>{title}</div>
      {children}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", fontSize: 12.5, gap: 12 }}>
      <span style={{ color: "var(--text2)", flexShrink: 0 }}>{k}</span>
      <span style={{ fontWeight: 600, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v}</span>
    </div>
  );
}
