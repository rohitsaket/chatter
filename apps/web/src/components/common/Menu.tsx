"use client";
import * as React from "react";

export interface MenuItem {
  label: string;
  /** Omitted for items that only open a submenu. */
  onClick?: () => void;
  danger?: boolean;
  icon?: React.ReactNode;
  /** Draw a divider above this item. */
  separator?: boolean;
  /**
   * Rendered greyed out and inert. `disabledReason` becomes the tooltip — used
   * so a feature that is not built yet says so instead of silently doing
   * nothing when clicked.
   */
  disabled?: boolean;
  disabledReason?: string;
  /** Nested flyout (e.g. mute durations). */
  submenu?: MenuItem[];
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
            boxShadow: "var(--shadow-md)",
            padding: 5,
          }}
        >
          {items.map((it) => (
            <MenuRow key={it.label} item={it} close={() => setOpen(false)} />
          ))}
        </div>
      )}
    </div>
  );
}

/** One menu row: optional icon, divider, disabled state and nested flyout. */
function MenuRow({ item, close }: { item: MenuItem; close: () => void }) {
  const [openSub, setOpenSub] = React.useState(false);
  const hasSub = Boolean(item.submenu?.length);

  const row = (
    <button
      type="button"
      role="menuitem"
      aria-haspopup={hasSub || undefined}
      aria-expanded={hasSub ? openSub : undefined}
      aria-disabled={item.disabled || undefined}
      title={item.disabled ? item.disabledReason : undefined}
      onClick={(e) => {
        e.stopPropagation();
        if (item.disabled) return;
        if (hasSub) {
          setOpenSub((o) => !o);
          return;
        }
        close();
        item.onClick?.();
      }}
      className={item.disabled ? undefined : "hoverable"}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        textAlign: "left",
        background: "transparent",
        border: "none",
        borderRadius: 8,
        padding: "8px 11px",
        fontSize: 13,
        fontWeight: 600,
        color: item.disabled ? "var(--text3)" : item.danger ? "var(--bad)" : "var(--text)",
        cursor: item.disabled ? "not-allowed" : "pointer",
        font: "inherit",
        opacity: item.disabled ? 0.65 : 1,
      }}
    >
      {item.icon && <span style={{ display: "flex", flexShrink: 0, width: 17 }}>{item.icon}</span>}
      <span style={{ flex: 1 }}>{item.label}</span>
      {hasSub && <span style={{ fontSize: 11, color: "var(--text3)" }}>{openSub ? "▾" : "▸"}</span>}
    </button>
  );

  return (
    <div style={{ position: "relative" }}>
      {item.separator && <div style={{ height: 1, background: "var(--border)", margin: "5px 4px" }} />}
      {row}
      {hasSub && openSub && (
        <div role="menu" style={{ padding: "2px 0 2px 26px" }}>
          {item.submenu!.map((sub) => (
            <MenuRow key={sub.label} item={sub} close={close} />
          ))}
        </div>
      )}
    </div>
  );
}
