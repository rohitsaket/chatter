"use client";

export default function ModuleError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        background: "var(--bg-subtle)",
        color: "var(--text)",
        padding: 24,
      }}
    >
      <div style={{ fontSize: 15.5, fontWeight: 800 }}>Something went wrong</div>
      <div style={{ fontSize: 13, color: "var(--text2)", maxWidth: 420, textAlign: "center", lineHeight: 1.55 }}>
        This section failed to load. Your other conversations and modules are unaffected.
      </div>
      <button
        onClick={reset}
        style={{
          marginTop: 6,
          background: "var(--p600)",
          color: "#fff",
          fontSize: 13,
          fontWeight: 700,
          border: "none",
          borderRadius: 10,
          padding: "9px 18px",
          cursor: "pointer",
          font: "inherit",
        }}
      >
        Try again
      </button>
    </div>
  );
}
