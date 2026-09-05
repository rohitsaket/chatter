"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { FileDto } from "@chatter/contracts";
import { Avatar } from "@chatter/ui";
import { api, API_URL } from "@/lib/api";
import { fileModified, formatBytes } from "@/lib/format";
import { useFile, useFiles } from "@/lib/queries";
import { DotsMenu } from "../common/Menu";
import { CloseIcon, SearchIcon, SendIcon, UploadIcon } from "../icons";

const GRID = "2.4fr .7fr .7fr 1.2fr .6fr 1.2fr .6fr .6fr";

const ICON_BG: Record<string, string> = {
  PDF: "#ef4457",
  SKETCH: "#f3a622",
  PPTX: "#f3701e",
  PPT: "#f3701e",
  MP4: "#8950f5",
  XLSX: "#22b967",
  XLS: "#22b967",
  DOCX: "#3d78f3",
  DOC: "#3d78f3",
  PNG: "#f3c81e",
  JPG: "#f3c81e",
  FIG: "#a259ff",
  MP3: "#7b68ee",
};

function iconBg(type: string): string {
  return ICON_BG[type] ?? "#8f9bb3";
}

function extLabel(type: string): string {
  return type === "SKETCH" ? "◆" : type.slice(0, 3);
}

type FileCat = "All Files" | "Documents" | "Images" | "Videos" | "Audio" | "Favorites";
type FileSort = "name-asc" | "name-desc" | "modified-desc" | "modified-asc";

const CAT_TYPES: Record<string, string[]> = {
  Documents: ["PDF", "DOCX", "XLSX", "PPTX", "DOC", "XLS", "PPT"],
  Images: ["PNG", "JPG"],
  Videos: ["MP4"],
  Audio: ["MP3"],
};

export function FilesModule() {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const files = useFiles(q || undefined);
  const [selId, setSelId] = React.useState<string | null>(null);
  const [detailClosed, setDetailClosed] = React.useState(false);
  const [cat, setCat] = React.useState<FileCat>("All Files");
  const [workspace, setWorkspace] = React.useState<string | null>(null);
  const [sort, setSort] = React.useState<FileSort>("modified-desc");
  const [isMobile, setIsMobile] = React.useState<boolean | null>(null);
  const qc = useQueryClient();
  const uploadRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 760);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const all = files.data ?? [];
  const rows = all
    .filter((f) => (cat === "Favorites" ? f.starred : cat === "All Files" ? true : (CAT_TYPES[cat] ?? []).includes(f.type)))
    .filter((f) => !workspace || f.sharedIn === workspace)
    .sort((a, b) =>
      sort === "name-asc" ? a.name.localeCompare(b.name)
      : sort === "name-desc" ? b.name.localeCompare(a.name)
      : sort === "modified-asc" ? a.updatedAt.localeCompare(b.updatedAt)
      : b.updatedAt.localeCompare(a.updatedAt),
    );
  const effectiveSel = detailClosed ? null : (selId ?? rows[0]?.id ?? null);
  const detail = useFile(effectiveSel);

  const star = useMutation({
    mutationFn: (id: string) => api<{ starred: boolean }>(`/files/${id}/star`, { method: "POST" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["files"] });
      void qc.invalidateQueries({ queryKey: ["file"] });
    },
  });

  const trash = useMutation({
    mutationFn: (id: string) => api<{ ok: true }>(`/files/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      setSelId(null);
      void qc.invalidateQueries({ queryKey: ["files"] });
    },
  });

  async function handleUpload(file: File) {
    const csrf = document.cookie.match(/(?:^|;\s*)chatter_csrf=([^;]+)/)?.[1] ?? "";
    await fetch(`${API_URL}/api/v1/files/upload`, {
      method: "POST",
      credentials: "include",
      headers: { "x-file-name": encodeURIComponent(file.name), "content-type": file.type || "application/octet-stream", "x-csrf-token": csrf },
      body: file,
    });
    void qc.invalidateQueries({ queryKey: ["files"] });
  }

  if (isMobile === null) return null;

  if (isMobile) {
    return (
      <div style={{ padding: 8 }}>
        {rows.map((f) => (
          <a
            key={f.id}
            href={`${API_URL}/api/v1/files/${f.id}/download`}
            className="hoverable"
            style={{ display: "flex", alignItems: "center", gap: 12, padding: 10, borderRadius: 12, cursor: "pointer", color: "inherit", textDecoration: "none" }}
          >
            <div style={{ width: 42, height: 42, borderRadius: 11, background: iconBg(f.type), display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 9, fontWeight: 800, flexShrink: 0 }}>
              {extLabel(f.type)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.name}</div>
              <div style={{ fontSize: 11.5, color: "var(--text2)", marginTop: 1 }}>
                {formatBytes(f.sizeBytes)} · {fileModified(f.updatedAt)}
              </div>
            </div>
            <span style={{ color: f.status === "READY" ? "var(--good)" : "var(--text3)" }}>{f.status === "READY" ? "✓" : "☁"}</span>
          </a>
        ))}
      </div>
    );
  }

  const totalBytes = all.reduce((a, f) => a + f.sizeBytes, 0);
  const cats: { name: FileCat; icon: string; count: number }[] = [
    { name: "All Files", icon: "▦", count: all.length },
    { name: "Documents", icon: "📄", count: all.filter((f) => CAT_TYPES.Documents!.includes(f.type)).length },
    { name: "Images", icon: "🖼", count: all.filter((f) => CAT_TYPES.Images!.includes(f.type)).length },
    { name: "Videos", icon: "🎞", count: all.filter((f) => CAT_TYPES.Videos!.includes(f.type)).length },
    { name: "Audio", icon: "🎵", count: all.filter((f) => CAT_TYPES.Audio!.includes(f.type)).length },
    { name: "Favorites", icon: "☆", count: all.filter((f) => f.starred).length },
  ];
  const workspaces = [...new Set(all.map((f) => f.sharedIn).filter((s): s is string => !!s))].slice(0, 6);

  return (
    <>
      <div style={{ width: 238, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: "1px solid var(--border)", background: "var(--bg)", overflowY: "auto" }}>
        <div style={{ padding: "16px 18px 12px", fontSize: 16, fontWeight: 800 }}>Files</div>
        <div style={{ padding: "0 10px", display: "flex", flexDirection: "column", gap: 2 }}>
          {cats.map((fc) => {
            const active = cat === fc.name;
            return (
              <div
                key={fc.name}
                className={active ? undefined : "hoverable"}
                onClick={() => setCat(fc.name)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "8.5px 11px", borderRadius: 11, cursor: "pointer", fontWeight: 600, fontSize: 13.5, background: active ? "var(--sel)" : "transparent", color: active ? "var(--accent-text)" : "var(--text)" }}
              >
                <span style={{ opacity: 0.8 }}>{fc.icon}</span>
                <span style={{ flex: 1 }}>{fc.name}</span>
                <span style={{ fontSize: 11.5, fontWeight: 700, borderRadius: 99, padding: "2px 8px", background: active ? "var(--p600)" : "var(--muted)", color: active ? "#fff" : "var(--text2)" }}>{fc.count}</span>
              </div>
            );
          })}
        </div>
        <div style={{ padding: "16px 18px 6px", fontSize: 11, fontWeight: 700, color: "var(--text3)", letterSpacing: ".06em" }}>MY WORKSPACES</div>
        <div style={{ padding: "0 10px 14px", display: "flex", flexDirection: "column", gap: 2 }}>
          {workspaces.map((w, i) => {
            const bgs = ["linear-gradient(135deg,#a873ff,#5e28c7)", "linear-gradient(135deg,#f08fb6,#b34a77)", "linear-gradient(135deg,#43c0a8,#1f7a68)", "linear-gradient(135deg,#5b8def,#2c4fa3)", "linear-gradient(135deg,#f3a15e,#c26a1f)", "linear-gradient(135deg,#8f9bb3,#4a5670)"];
            const active = workspace === w;
            return (
              <div
                key={w}
                className={active ? undefined : "hoverable"}
                onClick={() => setWorkspace(active ? null : w)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 11px", borderRadius: 11, cursor: "pointer", fontWeight: 600, fontSize: 13.5, background: active ? "var(--sel)" : "transparent", color: active ? "var(--accent-text)" : "var(--text)" }}
              >
                <div style={{ width: 26, height: 26, borderRadius: 8, background: bgs[i % bgs.length], display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10 }}>👥</div>
                {w}
              </div>
            );
          })}
          <div
            className="hoverable"
            onClick={() => router.push("/app/groups")}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", borderRadius: 11, cursor: "pointer", fontWeight: 700, fontSize: 13.5, color: "var(--accent-text)" }}
          >
            + Create Workspace
          </div>
        </div>
      </div>
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: "var(--bg)", borderRight: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px" }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800 }}>All Files</div>
            <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 2 }}>
              {rows.length} files · {formatBytes(totalBytes)} used
            </div>
          </div>
          <div style={{ flex: 1, maxWidth: 320, marginLeft: 12, display: "flex", alignItems: "center", gap: 8, background: "var(--muted)", borderRadius: 11, padding: "9px 12px", color: "var(--text3)" }}>
            <SearchIcon />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search files..." style={{ border: "none", outline: "none", background: "transparent", font: "inherit", fontSize: 13, color: "var(--text)", width: "100%" }} />
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
            <input
              ref={uploadRef}
              type="file"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleUpload(f);
                e.target.value = "";
              }}
            />
            <div
              className="hover-p700"
              onClick={() => uploadRef.current?.click()}
              style={{ background: "var(--p600)", color: "#fff", fontSize: 13, fontWeight: 700, borderRadius: 10, padding: "9px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}
            >
              <UploadIcon /> Upload
            </div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: GRID, gap: 8, padding: "9px 18px", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", fontSize: 12, fontWeight: 700, color: "var(--text2)", background: "var(--bg-subtle)" }}>
          <span onClick={() => setSort(sort === "name-asc" ? "name-desc" : "name-asc")} style={{ cursor: "pointer", userSelect: "none" }}>
            Name {sort === "name-asc" ? "↑" : sort === "name-desc" ? "↓" : "⇅"}
          </span>
          <span>Type</span>
          <span>Size</span>
          <span onClick={() => setSort(sort === "modified-desc" ? "modified-asc" : "modified-desc")} style={{ cursor: "pointer", userSelect: "none" }}>
            Modified {sort === "modified-desc" ? "↓" : sort === "modified-asc" ? "↑" : "⇅"}
          </span>
          <span>Owner</span>
          <span>Shared In</span>
          <span>Status</span>
          <span>Actions</span>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {rows.map((f) => {
            const isSel = effectiveSel === f.id;
            return (
              <div
                key={f.id}
                className={isSel ? undefined : "hoverable"}
                onClick={() => {
                  setDetailClosed(false);
                  setSelId(f.id);
                }}
                style={{ display: "grid", gridTemplateColumns: GRID, gap: 8, alignItems: "center", padding: "9px 18px", borderBottom: "1px solid var(--border)", cursor: "pointer", fontSize: 12.5, background: isSel ? "var(--sel)" : "transparent" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: iconBg(f.type), display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 8, fontWeight: 800, flexShrink: 0 }}>
                    {extLabel(f.type)}
                  </div>
                  <span style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.name}</span>
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      star.mutate(f.id);
                    }}
                    style={{ color: f.starred ? "#f3a622" : "var(--text3)", fontSize: 13, cursor: "pointer", padding: 2 }}
                  >
                    {f.starred ? "★" : "☆"}
                  </span>
                </div>
                <span style={cellStyle}>{f.type}</span>
                <span style={cellStyle}>{formatBytes(f.sizeBytes)}</span>
                <span style={cellStyle}>{fileModified(f.updatedAt)}</span>
                <Avatar name={f.owner.name} color={f.owner.avatarColor} size={26} fontSize={9}>
                  {f.owner.initials}
                </Avatar>
                <span style={{ color: "var(--text2)" }}>{f.sharedIn ?? "—"}</span>
                <span style={{ color: f.status === "READY" ? "var(--good)" : "var(--text3)", fontSize: 14 }}>{f.status === "READY" ? "✓" : "☁"}</span>
                <DotsMenu
                  trigger={<span style={{ color: "var(--text3)" }}>•••</span>}
                  items={[
                    { label: "Download", onClick: () => window.open(`${API_URL}/api/v1/files/${f.id}/download`, "_blank") },
                    { label: f.starred ? "Remove star" : "Star", onClick: () => star.mutate(f.id) },
                    { label: "Move to trash", danger: true, onClick: () => trash.mutate(f.id) },
                  ]}
                />
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", fontSize: 12.5, color: "var(--text2)" }}>
          <span>
            Showing 1 to {rows.length} of {rows.length} files
          </span>
        </div>
      </main>
      {detail.data && (
        <FileDetail
          f={detail.data}
          onStar={() => star.mutate(detail.data!.id)}
          onTrash={() => trash.mutate(detail.data!.id)}
          onClose={() => setDetailClosed(true)}
        />
      )}
    </>
  );
}

const cellStyle: React.CSSProperties = {
  color: "var(--text2)",
  minWidth: 0,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

function FileDetail({ f, onStar, onTrash, onClose }: { f: FileDto; onStar: () => void; onTrash: () => void; onClose: () => void }) {
  const qc = useQueryClient();
  const [comment, setComment] = React.useState("");
  const [copied, setCopied] = React.useState(false);
  const commentMut = useMutation({
    mutationFn: (body: string) => api<FileDto>(`/files/${f.id}/comments`, { method: "POST", json: { body } }),
    onSuccess: () => {
      setComment("");
      void qc.invalidateQueries({ queryKey: ["file", f.id] });
    },
  });

  async function copyLink() {
    // Authenticated download link: works for signed-in members of the org
    // (files are never exposed through permanent public URLs).
    await navigator.clipboard.writeText(`${API_URL}/api/v1/files/${f.id}/download`).catch(() => void 0);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <aside style={{ width: 300, flexShrink: 0, background: "var(--bg)", overflowY: "auto", padding: "0 18px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0 10px" }}>
        <span style={{ fontSize: 14.5, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.name}</span>
        <span onClick={onClose} style={{ cursor: "pointer", color: "var(--text2)", display: "flex" }}>
          <CloseIcon size={16} />
        </span>
      </div>
      <div style={{ position: "relative", height: 150, borderRadius: 14, background: "repeating-linear-gradient(45deg,#1c1a2e,#1c1a2e 14px,#232041 14px,#232041 28px)", display: "flex", alignItems: "center", justifyContent: "center", color: "#8f8bb0", fontFamily: "ui-monospace,monospace", fontSize: 11 }}>
        {f.type.toLowerCase()} preview
        <span style={{ position: "absolute", left: 10, bottom: 10, background: "rgba(0,0,0,.6)", color: "#fff", fontSize: 9.5, fontWeight: 800, borderRadius: 6, padding: "3px 7px" }}>{f.type}</span>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <a
          href={`${API_URL}/api/v1/files/${f.id}/download`}
          className="hover-p700"
          style={{ flex: 1, background: "var(--p600)", color: "#fff", fontSize: 13, fontWeight: 700, borderRadius: 10, padding: "9px 0", textAlign: "center", cursor: "pointer", textDecoration: "none" }}
        >
          ⬇ Download
        </a>
        <div
          className="hoverable"
          onClick={() => void copyLink()}
          style={{ flex: 1, border: "1px solid var(--border)", fontSize: 13, fontWeight: 700, borderRadius: 10, padding: "9px 0", textAlign: "center", cursor: "pointer", color: copied ? "var(--good)" : "var(--text)" }}
        >
          {copied ? "Link copied ✓" : "Share"}
        </div>
        <DotsMenu
          size={38}
          trigger={<span>•••</span>}
          triggerStyle={{ border: "1px solid var(--border)", borderRadius: 10, color: "var(--text2)", height: "auto", alignSelf: "stretch" }}
          items={[
            { label: f.starred ? "Remove star" : "Star", onClick: onStar },
            { label: "Copy link", onClick: () => void copyLink() },
            { label: "Move to trash", danger: true, onClick: onTrash },
          ]}
        />
      </div>
      <div style={{ borderTop: "1px solid var(--border)", marginTop: 14, paddingTop: 12 }}>
        <div style={{ fontSize: 13.5, fontWeight: 800 }}>File Details</div>
        {[
          ["Type", `${f.type} Document`],
          ["Size", formatBytes(f.sizeBytes)],
          ["Location", `/${f.sharedIn ?? "Files"}`],
          ["Modified", fileModified(f.updatedAt)],
          ["Created", fileModified(f.createdAt)],
          ["Status", f.status === "READY" ? "Synced ✓" : f.status],
        ].map(([k, v]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6.5px 0", fontSize: 12.5 }}>
            <span style={{ color: "var(--text2)" }}>{k}</span>
            <span style={{ fontWeight: 600 }}>{v}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6.5px 0", fontSize: 12.5 }}>
          <span style={{ color: "var(--text2)" }}>Owner</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
            <Avatar name={f.owner.name} color={f.owner.avatarColor} size={20} fontSize={8}>
              {f.owner.initials}
            </Avatar>
            {f.owner.name}
          </span>
        </div>
      </div>
      {f.versions && f.versions.length > 0 && (
        <div style={{ borderTop: "1px solid var(--border)", marginTop: 10, paddingTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13.5, fontWeight: 800 }}>Version History</span>
          </div>
          {f.versions.map((v, i) => (
            <div key={v.version} style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 0", fontSize: 12.5 }}>
              <b>{v.version}</b>
              <span style={{ color: "var(--text2)", flex: 1 }}>
                {fileModified(v.createdAt)}
                {v.authorName ? ` · ${v.authorName}` : ""}
              </span>
              {i === 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--accent-text)", background: "var(--p100)", borderRadius: 99, padding: "2px 8px" }}>Current</span>
              )}
            </div>
          ))}
        </div>
      )}
      <div style={{ borderTop: "1px solid var(--border)", marginTop: 10, paddingTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13.5, fontWeight: 800 }}>Comments ({f.comments?.length ?? 0})</span>
        </div>
        {(f.comments ?? []).map((c) => (
          <div key={c.id} style={{ display: "flex", gap: 9, padding: "9px 0" }}>
            <Avatar name={c.authorName} color={c.authorAvatarColor} size={28} fontSize={9}>
              {c.authorInitials}
            </Avatar>
            <div>
              <div style={{ fontSize: 12 }}>
                <b>{c.authorName}</b> <span style={{ color: "var(--text3)", fontSize: 11 }}>{fileModified(c.createdAt)}</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 2 }}>{c.body}</div>
            </div>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", background: "var(--muted)", borderRadius: 10, padding: "2px 4px 2px 12px" }}>
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && comment.trim()) {
                  e.preventDefault();
                  commentMut.mutate(comment.trim());
                }
              }}
              placeholder="Write a comment..."
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", font: "inherit", fontSize: 12.5, color: "var(--text)", padding: "8px 0" }}
            />
          </div>
          <div
            onClick={() => comment.trim() && commentMut.mutate(comment.trim())}
            style={{ width: 34, height: 34, borderRadius: 9, background: "var(--p600)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <SendIcon size={14} />
          </div>
        </div>
      </div>
    </aside>
  );
}
