"use client";
import * as React from "react";

/** Derive up-to-2-letter initials from a display name. */
export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase())
    .slice(0, 2)
    .join("");
}

const FALLBACK_GRADIENT = "linear-gradient(135deg,#8f9bb3,#4a5670)";

export function Avatar({
  name,
  color,
  size = 44,
  fontSize,
  online,
  presenceDot,
  border,
  children,
}: {
  name: string;
  color?: string | null;
  size?: number;
  fontSize?: number;
  /** Show green online dot. */
  online?: boolean;
  /** Explicit presence dot color (overrides `online`). */
  presenceDot?: string;
  border?: string;
  children?: React.ReactNode;
}) {
  const dot = presenceDot ?? (online ? "var(--good)" : undefined);
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: color ?? FALLBACK_GRADIENT,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontSize: fontSize ?? Math.round(size * 0.32),
          fontWeight: 700,
          border,
        }}
      >
        {children ?? initialsOf(name)}
      </div>
      {dot && (
        <span
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            width: Math.max(10, Math.round(size * 0.26)),
            height: Math.max(10, Math.round(size * 0.26)),
            borderRadius: "50%",
            background: dot,
            border: "2px solid var(--bg)",
          }}
        />
      )}
    </div>
  );
}

export function Badge({ children, bg = "var(--p600)", fg = "#fff" }: { children: React.ReactNode; bg?: string; fg?: string }) {
  return (
    <span
      style={{
        background: bg,
        color: fg,
        fontSize: 10.5,
        fontWeight: 700,
        borderRadius: 99,
        padding: "2px 7px",
        flexShrink: 0,
      }}
    >
      {children}
    </span>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      style={{
        width: 44,
        height: 25,
        borderRadius: 99,
        background: on ? "var(--p600)" : "var(--border2)",
        position: "relative",
        cursor: "pointer",
        transition: "background .18s",
        border: "none",
        padding: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2.5,
          left: on ? 21 : 3,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,.25)",
          transition: "left .18s",
        }}
      />
    </button>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  padding = "7px 15px",
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  padding?: string;
}) {
  return (
    <div style={{ display: "flex", background: "var(--muted)", borderRadius: 11, padding: 3 }}>
      {options.map((o) => {
        const sel = o === value;
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            style={{
              font: "inherit",
              fontSize: 12.5,
              fontWeight: 700,
              borderRadius: 9,
              padding,
              cursor: "pointer",
              background: sel ? "var(--bg)" : "transparent",
              color: sel ? "var(--p600)" : "var(--text2)",
              boxShadow: sel ? "0 1px 3px rgba(23,21,37,.12)" : "none",
              border: "none",
            }}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

/** Small colored presence dot used in tables and lists. */
export function PresenceDot({ presence, size = 7 }: { presence: "ONLINE" | "AWAY" | "BUSY" | "OFFLINE"; size?: number }) {
  const color =
    presence === "ONLINE" ? "var(--good)" : presence === "AWAY" ? "var(--warn)" : presence === "BUSY" ? "var(--bad)" : "var(--border2)";
  return <span style={{ width: size, height: size, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />;
}

export function presenceLabel(p: "ONLINE" | "AWAY" | "BUSY" | "OFFLINE"): string {
  return p === "ONLINE" ? "Online" : p === "AWAY" ? "Away" : p === "BUSY" ? "Busy" : "Offline";
}
