"use client";
import * as React from "react";

export interface MenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
}

/**
 * Minimal anchored popover menu for "•••" actions. Closes on outside click
 * and Escape; keyboard accessible (the trigger is a real button).
 */
export function DotsMenu({
  items,
  trigger,
  size = 29,
  triggerStyle,
}: {
  items: MenuItem[];
  trigger: React.ReactNode;
  size?: number;
  triggerStyle?: React.CSSProperties;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", display: "flex" }}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="hoverable"
        style={{
          width: size,
          height: size,
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          background: "transparent",
          border: "none",
          color: "inherit",
          padding: 0,
          font: "inherit",
          ...triggerStyle,
        }}
      >
        {trigger}
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            zIndex: 60,
            minWidth: 178,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            boxShadow: "0 10px 30px -8px rgba(23,21,37,.25)",
            padding: 5,
          }}
        >
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                it.onClick();
              }}
              className="hoverable"
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                background: "transparent",
                border: "none",
                borderRadius: 8,
                padding: "8px 11px",
                fontSize: 13,
                fontWeight: 600,
                color: it.danger ? "var(--bad)" : "var(--text)",
                cursor: "pointer",
                font: "inherit",
              }}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
