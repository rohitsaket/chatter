"use client";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Avatar } from "@chatter/ui";
import { useMe } from "@/lib/queries";

const NAV = [
  { name: "Overview", icon: "👤", active: true },
  { name: "Personal Information", icon: "🪪" },
  { name: "Preferences", icon: "⚙" },
  { name: "Notifications", icon: "🔔" },
  { name: "Privacy", icon: "🛡" },
  { name: "Security", icon: "🔒" },
  { name: "Devices", icon: "💻" },
  { name: "Integrations", icon: "🔗" },
  { name: "Billing", icon: "💳" },
];

export default function ProfilePage() {
  const router = useRouter();
  const me = useMe();
  const [isMobile, setIsMobile] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 760);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const u = me.data;
  if (!u || isMobile === null) return null;

  if (isMobile) {
    return (
      <div style={{ padding: 10 }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 18, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Avatar name={u.name} color={u.avatarColor} size={88} fontSize={28} />
          <div style={{ fontSize: 17, fontWeight: 800, marginTop: 10 }}>{u.name}</div>
          <div style={{ fontSize: 12.5, color: "var(--text2)", marginTop: 2 }}>
            {u.title} · {u.organization.name}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--text2)", marginTop: 10, textAlign: "center", lineHeight: 1.55 }}>
            Full profile, devices and security are available in the desktop layout.
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{ width: 260, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: "1px solid var(--border)", background: "var(--bg)" }}>
        <div style={{ padding: "16px 18px 4px", fontSize: 12, fontWeight: 700, color: "var(--text3)" }}>Account</div>
        <div style={{ padding: "0 10px", display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV.map((pn) => (
            <div
              key={pn.name}
              className={pn.active ? undefined : "hoverable"}
              onClick={pn.active ? undefined : () => router.push("/app/settings")}
              title={pn.active ? undefined : "Managed under Settings"}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", borderRadius: 11, cursor: "pointer", fontWeight: 600, fontSize: 13.5, background: pn.active ? "var(--sel)" : "transparent", color: pn.active ? "var(--accent-text)" : "var(--text)" }}
            >
              <span style={{ opacity: 0.8 }}>{pn.icon}</span>
              {pn.name}
            </div>
          ))}
        </div>
      </div>
      <main style={{ flex: 1, minWidth: 0, overflowY: "auto", background: "var(--bg-subtle)", padding: "16px 20px 24px" }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, overflow: "hidden", boxShadow: "var(--shadow)" }}>
          <div style={{ height: 170, background: "linear-gradient(140deg,#e8b3c8 0%,#b58fd4 30%,#7a6bb8 55%,#4a4a80 80%,#333356 100%)", position: "relative" }}>
            <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(45deg,transparent,transparent 30px,rgba(255,255,255,.05) 30px,rgba(255,255,255,.05) 60px)" }} />
          </div>
          <div style={{ display: "flex", gap: 18, padding: "0 24px 20px" }}>
            <div style={{ position: "relative", marginTop: -48 }}>
              <div style={{ width: 118, height: 118, borderRadius: "50%", background: u.avatarColor ?? undefined, border: "5px solid var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 36, fontWeight: 800 }}>
                {u.initials}
              </div>
              <span style={{ position: "absolute", right: 9, bottom: 9, width: 17, height: 17, borderRadius: "50%", background: "var(--good)", border: "3px solid var(--surface)" }} />
            </div>
            <div style={{ flex: 1, paddingTop: 14 }}>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{u.name}</div>
              <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 3 }}>
                {u.title} · {u.department} Department
              </div>
              <div style={{ fontSize: 13, color: "var(--text2)" }}>{u.organization.name}</div>
              <div style={{ fontSize: 12.5, color: "var(--good)", marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--good)" }} />
                Online
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", paddingBottom: 2 }}>
              <div
                className="hover-p700"
                onClick={() => router.push("/app/settings")}
                style={{ background: "var(--p600)", color: "#fff", borderRadius: 99, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
              >
                ✏️ Edit Profile
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginTop: 14 }}>
          <div style={profileCard}>
            <div style={{ fontWeight: 800, fontSize: 13.5 }}>About</div>
            <div style={{ fontSize: 12.5, color: "var(--text2)", lineHeight: 1.6, marginTop: 8 }}>{u.about ?? "—"}</div>
            <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 12 }}>Role</div>
            <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>{u.orgRole}</div>
          </div>
          <div style={profileCard}>
            <div style={{ fontWeight: 800, fontSize: 13.5 }}>Contact Information</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, padding: "9px 0", marginTop: 5 }}>
              <span style={{ color: "var(--p500)" }}>✉</span> {u.email}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, padding: "9px 0" }}>
              <span style={{ color: "var(--p500)" }}>📞</span> {u.phone ?? "—"}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, padding: "9px 0" }}>
              <span style={{ color: "var(--p500)" }}>📍</span> {u.location ?? "—"}
            </div>
          </div>
          <div style={profileCard}>
            <div style={{ fontWeight: 800, fontSize: 13.5 }}>🏢 Organization</div>
            <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 9 }}>Company</div>
            <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>{u.organization.name}</div>
            <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 9 }}>Department</div>
            <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>{u.department ?? "—"}</div>
            <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 9 }}>Role</div>
            <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>{u.title ?? "—"}</div>
          </div>
          <div style={{ ...profileCard, gridColumn: "span 2" }}>
            <div style={{ fontWeight: 800, fontSize: 13.5 }}>Security</div>
            <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
              <span>🔒</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700 }}>Password</div>
                <div style={{ fontSize: 11, color: "var(--text2)" }}>Argon2id-hashed; change it any time.</div>
              </div>
              <span onClick={() => router.push("/app/settings")} style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-text)", border: "1px solid var(--border)", borderRadius: 99, padding: "5px 12px", cursor: "pointer" }}>Change</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 0" }}>
              <span>🛡</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700 }}>Two-Factor Authentication</div>
                <div style={{ fontSize: 11, color: "var(--text2)" }}>{u.mfaEnabled ? "Enabled" : "Not enabled"}</div>
              </div>
              <span onClick={() => router.push("/app/settings")} style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-text)", border: "1px solid var(--border)", borderRadius: 99, padding: "5px 12px", cursor: "pointer" }}>Manage</span>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

const profileCard: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 15,
  padding: 16,
  boxShadow: "var(--shadow)",
};
