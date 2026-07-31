"use client";
import { useRouter } from "next/navigation";
import * as React from "react";

export function SimpleListShell({
  title,
  subtitle,
  action,
  onAction,
  children,
}: {
  title: string;
  subtitle: string;
  action?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: "var(--bg-subtle)", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 26px 12px", background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
        <div>
          <div style={{ fontSize: 19, fontWeight: 800 }}>{title}</div>
          <div style={{ fontSize: 12.5, color: "var(--text2)", marginTop: 3 }}>{subtitle}</div>
        </div>
        {action && (
          <div onClick={onAction} style={{ fontSize: 12.5, fontWeight: 700, color: "var(--p600)", cursor: "pointer" }}>
            {action}
          </div>
        )}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 26px", display: "flex", flexDirection: "column", gap: 10, maxWidth: 760 }}>{children}</div>
    </main>
  );
}

export function SimpleCard({
  avatar,
  avatarBg,
  title,
  time,
  body,
  dot,
  href,
}: {
  avatar: string;
  avatarBg: string;
  title: string;
  time: string;
  body: string;
  dot?: boolean;
  href?: string;
}) {
  const router = useRouter();
  return (
    <div
      className="hover-border"
      onClick={href ? () => router.push(href) : undefined}
      style={{ display: "flex", gap: 12, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "13px 16px", cursor: "pointer", boxShadow: "var(--shadow)" }}
    >
      <div style={{ width: 40, height: 40, borderRadius: "50%", background: avatarBg, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
        {avatar}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 13.5, fontWeight: 700 }}>{title}</span>
          <span style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--text3)", flexShrink: 0 }}>{time}</span>
        </div>
        <div style={{ fontSize: 12.5, color: "var(--text2)", lineHeight: 1.5, marginTop: 3 }}>{body}</div>
      </div>
      {dot && <span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--p500)", alignSelf: "center", flexShrink: 0 }} />}
    </div>
  );
}
