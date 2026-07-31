import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        background: "var(--bg)",
        color: "var(--text)",
        padding: 24,
      }}
    >
      <div style={{ fontSize: 20, fontWeight: 800 }}>Page not found</div>
      <div style={{ fontSize: 13.5, color: "var(--text2)", textAlign: "center", lineHeight: 1.55 }}>
        The page you are looking for does not exist or may have been moved.
      </div>
      <Link
        href="/app/chats"
        style={{
          marginTop: 6,
          background: "var(--p600)",
          color: "#fff",
          fontSize: 13,
          fontWeight: 700,
          borderRadius: 10,
          padding: "9px 18px",
        }}
      >
        Back to Chats
      </Link>
    </div>
  );
}
