"use client";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ContactDto } from "@chatter/contracts";
import { Avatar, PresenceDot, presenceLabel } from "@chatter/ui";
import { api } from "@/lib/api";
import { useContacts } from "@/lib/queries";
import { DotsMenu } from "../common/Menu";
import { AddPersonIcon, ChatIcon, CloseIcon, DotsHIcon, DotsVIcon, FilterIcon, PhoneIcon, SearchIcon, VideoIcon } from "../icons";

const GRID = "2.1fr 1.5fr 1.2fr 1fr 1.4fr 100px";

type ContactCat = "All Contacts" | "Favorites" | "Online" | "Blocked" | "External Contacts";
type ContactSort = "A–Z" | "Z–A";

export function ContactsModule() {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const contacts = useContacts(q || undefined);
  const [selId, setSelId] = React.useState<string | null>(null);
  const [detailClosed, setDetailClosed] = React.useState(false);
  const [cat, setCat] = React.useState<ContactCat>("All Contacts");
  const [sort, setSort] = React.useState<ContactSort>("A–Z");
  const [isMobile, setIsMobile] = React.useState<boolean | null>(null);
  const qc = useQueryClient();

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 760);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const all = contacts.data ?? [];
  const rows = all
    .filter((c) =>
      cat === "Favorites" ? c.favorite
      : cat === "Online" ? c.presence === "ONLINE"
      : cat === "Blocked" ? c.blocked
      : cat === "External Contacts" ? false
      : true,
    )
    .sort((a, b) => (sort === "A–Z" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)));
  const sel = detailClosed ? undefined : (rows.find((c) => c.id === selId) ?? rows[0]);

  const toggleFavorite = (id: string) => api(`/contacts/${id}/favorite`, { method: "POST" }).then(() => qc.invalidateQueries({ queryKey: ["contacts"] }));

  const openDm = useMutation({
    mutationFn: (userId: string) => api<{ slug: string | null; id: string }>("/conversations/dm", { method: "POST", json: { userId } }),
    onSuccess: (conv) => {
      void qc.invalidateQueries({ queryKey: ["conversations"] });
      router.push(`/app/chats/${conv.slug ?? conv.id}`);
    },
  });

  if (isMobile === null) return null;

  if (isMobile) {
    return (
      <div style={{ padding: 8 }}>
        {rows.map((ct) => (
          <div key={ct.id} className="hoverable" onClick={() => openDm.mutate(ct.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 10px", borderRadius: 12, cursor: "pointer" }}>
            <Avatar name={ct.name} color={ct.avatarColor} size={46} fontSize={14} presenceDot={dotOf(ct)} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{ct.name}</div>
              <div style={{ fontSize: 12, color: "var(--text2)" }}>
                {ct.title} · {ct.department}
              </div>
            </div>
            <div
              onClick={(e) => {
                e.stopPropagation();
                openDm.mutate(ct.id);
              }}
              style={{ width: 38, height: 38, borderRadius: 11, background: "var(--p100)", color: "var(--p600)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <ChatIcon size={16} strokeWidth={1.7} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const cats: { name: ContactCat; icon: string; count: number }[] = [
    { name: "All Contacts", icon: "👥", count: all.length },
    { name: "Favorites", icon: "☆", count: all.filter((c) => c.favorite).length },
    { name: "Online", icon: "🟢", count: all.filter((c) => c.presence === "ONLINE").length },
  ];

  return (
    <>
      <div style={{ width: 238, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: "1px solid var(--border)", background: "var(--bg)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px 12px" }}>
          <span style={{ fontSize: 16, fontWeight: 800 }}>Contacts</span>
          <span title="Contacts are provisioned from your organization directory" style={{ color: "var(--text3)", display: "flex", opacity: 0.55 }}>
            <AddPersonIcon />
          </span>
        </div>
        <div style={{ padding: "0 10px", display: "flex", flexDirection: "column", gap: 2 }}>
          {cats.map((cc) => {
            const active = cat === cc.name;
            return (
              <div
                key={cc.name}
                className={active ? undefined : "hoverable"}
                onClick={() => setCat(cc.name)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", borderRadius: 11, cursor: "pointer", fontWeight: 600, fontSize: 13.5, background: active ? "var(--sel)" : "transparent", color: active ? "var(--p600)" : "var(--text)" }}
              >
                <span style={{ opacity: 0.8 }}>{cc.icon}</span>
                <span style={{ flex: 1 }}>{cc.name}</span>
                <span style={{ fontSize: 11.5, fontWeight: 700, borderRadius: 99, padding: "2px 8px", background: active ? "var(--p600)" : "var(--muted)", color: active ? "#fff" : "var(--text2)" }}>{cc.count}</span>
              </div>
            );
          })}
        </div>
        <div style={{ margin: "10px 18px 0", borderTop: "1px solid var(--border)" }} />
        <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 2 }}>
          <div
            className={cat === "All Contacts" ? undefined : "hoverable"}
            onClick={() => setCat("All Contacts")}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", borderRadius: 11, cursor: "pointer", fontWeight: 600, fontSize: 13.5 }}
          >
            <span style={{ opacity: 0.8 }}>🏢</span> Organization Directory
          </div>
          <div
            className={cat === "External Contacts" ? undefined : "hoverable"}
            onClick={() => setCat("External Contacts")}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", borderRadius: 11, cursor: "pointer", fontWeight: 600, fontSize: 13.5, background: cat === "External Contacts" ? "var(--sel)" : "transparent", color: cat === "External Contacts" ? "var(--p600)" : "var(--text)" }}
          >
            <span style={{ opacity: 0.8 }}>🌐</span> External Contacts
          </div>
          <div
            className={cat === "Blocked" ? undefined : "hoverable"}
            onClick={() => setCat("Blocked")}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", borderRadius: 11, cursor: "pointer", fontWeight: 600, fontSize: 13.5, background: cat === "Blocked" ? "var(--sel)" : "transparent", color: cat === "Blocked" ? "var(--p600)" : "var(--text)" }}
          >
            <span style={{ opacity: 0.8 }}>🚫</span>
            <span style={{ flex: 1 }}>Blocked</span>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text2)" }}>{all.filter((c) => c.blocked).length}</span>
          </div>
        </div>
      </div>
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: "var(--bg)", borderRight: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px" }}>
          <div style={{ flex: 1, maxWidth: 420, display: "flex", alignItems: "center", gap: 8, background: "var(--muted)", borderRadius: 11, padding: "9px 12px", color: "var(--text3)" }}>
            <SearchIcon />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search contacts..." style={{ border: "none", outline: "none", background: "transparent", font: "inherit", fontSize: 13, color: "var(--text)", width: "100%" }} />
          </div>
          <DotsMenu
            size={38}
            trigger={<FilterIcon />}
            triggerStyle={{ borderRadius: 11, border: "1px solid var(--border)", color: "var(--text2)" }}
            items={[
              { label: "All contacts", onClick: () => setCat("All Contacts") },
              { label: "Online only", onClick: () => setCat("Online") },
              { label: "Favorites only", onClick: () => setCat("Favorites") },
            ]}
          />
          <div
            onClick={() => setSort(sort === "A–Z" ? "Z–A" : "A–Z")}
            style={{ marginLeft: "auto", fontSize: 12.5, color: "var(--text2)", cursor: "pointer", userSelect: "none" }}
          >
            Sort by: <b style={{ color: "var(--text)" }}>{sort}</b> ▾
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: GRID, gap: 8, padding: "8px 18px", borderBottom: "1px solid var(--border)", fontSize: 12, fontWeight: 700, color: "var(--text2)" }}>
          <span>Name</span>
          <span>Role</span>
          <span>Department</span>
          <span>Status</span>
          <span>Phone</span>
          <span style={{ textAlign: "right" }}>Actions</span>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {rows.map((ct) => {
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
                    <div style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ct.name}</div>
                    <div style={{ fontSize: 11.5, color: "var(--text2)", display: "flex", alignItems: "center", gap: 5 }}>
                      <PresenceDot presence={ct.presence} size={6} />
                      {presenceLabel(ct.presence)}
                    </div>
                  </div>
                </div>
                <span style={cellStyle}>{ct.title}</span>
                <span style={cellStyle}>{ct.department}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text2)", fontSize: 12.5, minWidth: 0, overflow: "hidden" }}>
                  <PresenceDot presence={ct.presence} />
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{presenceLabel(ct.presence)}</span>
                </span>
                <span style={{ ...cellStyle, fontSize: 12.5 }}>{ct.phone}</span>
                <div style={{ display: "flex", gap: 4, justifyContent: "flex-end", color: "var(--text2)" }}>
                  <div
                    className="hoverable-sel"
                    onClick={(e) => {
                      e.stopPropagation();
                      openDm.mutate(ct.id);
                    }}
                    style={{ width: 29, height: 29, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--p600)" }}
                  >
                    <ChatIcon size={14} strokeWidth={1.7} />
                  </div>
                  <div
                    className="hoverable-sel"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push("/app/calls");
                    }}
                    style={{ width: 29, height: 29, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--p600)" }}
                  >
                    <PhoneIcon size={13} strokeWidth={1.7} />
                  </div>
                  <DotsMenu
                    trigger={<DotsVIcon size={14} />}
                    items={[
                      { label: "Message", onClick: () => openDm.mutate(ct.id) },
                      { label: ct.favorite ? "Remove from favorites" : "Add to favorites", onClick: () => void toggleFavorite(ct.id) },
                      { label: "View details", onClick: () => { setDetailClosed(false); setSelId(ct.id); } },
                    ]}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", fontSize: 12.5, color: "var(--text2)" }}>
          <span>
            Showing 1 to {rows.length} of {rows.length} contacts
          </span>
        </div>
      </main>
      {sel && <ContactDetail ct={sel} onMessage={() => openDm.mutate(sel.id)} onFavorite={() => void toggleFavorite(sel.id)} onClose={() => setDetailClosed(true)} />}
    </>
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

function ContactDetail({ ct, onMessage, onFavorite, onClose }: { ct: ContactDto; onMessage: () => void; onFavorite: () => void; onClose: () => void }) {
  const router = useRouter();
  return (
    <aside style={{ width: 300, flexShrink: 0, background: "var(--bg)", overflowY: "auto", padding: "0 20px 20px" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "16px 0 4px" }}>
        <span onClick={onClose} style={{ cursor: "pointer", color: "var(--text2)", display: "flex" }}>
          <CloseIcon />
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Avatar name={ct.name} color={ct.avatarColor} size={104} fontSize={32} presenceDot={dotOf(ct)} />
        <div style={{ fontSize: 19, fontWeight: 800, marginTop: 12 }}>
          {ct.name}{" "}
          <span onClick={onFavorite} style={{ color: ct.favorite ? "#f3a622" : "var(--text3)", fontSize: 15, cursor: "pointer" }}>
            {ct.favorite ? "★" : "☆"}
          </span>
        </div>
        <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 3 }}>{ct.title}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, width: "100%", marginTop: 16 }}>
          {[
            { label: "Message", icon: <ChatIcon size={16} strokeWidth={1.7} />, onClick: onMessage },
            { label: "Call", icon: <PhoneIcon size={15} strokeWidth={1.7} />, onClick: () => router.push("/app/calls") },
            { label: "Video", icon: <VideoIcon size={16} />, onClick: () => router.push("/app/calls") },
          ].map((a) => (
            <div key={a.label} className="hoverable-sel" onClick={a.onClick} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: "var(--muted)", borderRadius: 12, padding: "11px 4px", cursor: "pointer", color: "var(--p600)" }}>
              {a.icon}
              <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--text2)" }}>{a.label}</span>
            </div>
          ))}
          <DotsMenu
            size={0}
            trigger={
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: "var(--muted)", borderRadius: 12, padding: "11px 4px", cursor: "pointer", color: "var(--p600)", width: "100%" }}>
                <DotsHIcon size={16} />
                <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--text2)" }}>More</span>
              </div>
            }
            triggerStyle={{ width: "100%", height: "auto", display: "block" }}
            items={[
              { label: ct.favorite ? "Remove from favorites" : "Add to favorites", onClick: onFavorite },
              { label: "Message", onClick: onMessage },
            ]}
          />
        </div>
      </div>
      <Section title="About">
        <Row k="Email" v={ct.email} />
        <Row k="Phone" v={ct.phone ?? "—"} />
        <Row k="Location" v={ct.location ?? "—"} />
        <Row k="Status" v={presenceLabel(ct.presence)} />
      </Section>
      <Section title="Organization">
        <Row k="Department" v={ct.department ?? "—"} />
        <Row k="Team" v={ct.department ? `${ct.department} Team` : "—"} />
        <Row k="Role" v={ct.title ?? "—"} />
      </Section>
      {ct.notes && (
        <Section title="Notes">
          <div style={{ fontSize: 12.5, color: "var(--text2)", lineHeight: 1.6, marginTop: 7 }}>{ct.notes}</div>
        </Section>
      )}
      {ct.tags.length > 0 && (
        <Section title="Tags">
          <div style={{ display: "flex", gap: 7, marginTop: 9, flexWrap: "wrap" }}>
            {ct.tags.map((t) => (
              <span key={t} style={{ fontSize: 11, fontWeight: 700, color: "var(--p600)", background: "var(--p100)", borderRadius: 99, padding: "4px 11px" }}>
                {t}
              </span>
            ))}
          </div>
        </Section>
      )}
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
