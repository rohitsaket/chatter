"use client";
import * as React from "react";
import { SegmentedControl, Toggle } from "@chatter/ui";
import { useSettings, useUpdateSettings } from "@/lib/queries";

const NAV = [
  { name: "General", desc: "Basic preferences and startup.", icon: "⚙", active: true },
  { name: "Theme", desc: "Appearance, colors and wallpaper.", icon: "🎨" },
  { name: "Chat Settings", desc: "Message behavior and reactions.", icon: "💬" },
  { name: "Font Settings", desc: "Customize fonts and sizes.", icon: "🔤" },
  { name: "Notifications", desc: "Manage alerts and sounds.", icon: "🔔" },
  { name: "Privacy", desc: "Control your privacy settings.", icon: "🕶" },
  { name: "Security", desc: "Password, sessions and 2FA.", icon: "🛡" },
  { name: "Calls", desc: "Call preferences and devices.", icon: "📞" },
  { name: "Files & Storage", desc: "Storage usage and downloads.", icon: "📁" },
  { name: "Devices", desc: "Manage your connected devices.", icon: "💻" },
  { name: "Accessibility", desc: "Accessibility and display options.", icon: "♿" },
  { name: "Language", desc: "App language and translations.", icon: "🌐" },
  { name: "Account", desc: "Profile, plan and billing.", icon: "👤" },
];

const ACCENTS = [
  { id: "purple", color: "#7137e8" },
  { id: "blue", color: "#3d78f3" },
  { id: "teal", color: "#14b8c4" },
  { id: "green", color: "#22b967" },
  { id: "orange", color: "#f38922" },
  { id: "rose", color: "#ef4470" },
] as const;

const WALLPAPERS = [
  { name: "None", bgc: "var(--muted)", none: true },
  { name: "Classic", bgc: "linear-gradient(150deg,#e8ddfb,#c9b3f2 60%,#b39ae8)" },
  { name: "Aurora", bgc: "linear-gradient(150deg,#f3d7e8,#cdb7ec 55%,#a9c4ef)" },
  { name: "Dunes", bgc: "linear-gradient(150deg,#ecd4b2,#dcb27e 60%,#c99a62)" },
  { name: "Forest", bgc: "linear-gradient(150deg,#9db8a4,#5e7f68 60%,#3d5c48)" },
  { name: "Galaxy", bgc: "linear-gradient(150deg,#2c2650,#1a1538 55%,#0e0b22)" },
];

export default function SettingsPage() {
  const settings = useSettings();
  const update = useUpdateSettings();
  const [isMobile, setIsMobile] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 760);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const s = settings.data;
  if (!s || isMobile === null) return null;

  const themeLabel = s.theme === "dark" ? "Dark" : s.theme === "system" ? "System" : "Light";

  const settingsBody = (
    <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "14px 12px" : "20px 26px" }}>
      {!isMobile && (
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 21, fontWeight: 800 }}>General</div>
            <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 4 }}>Customize your app experience and startup preferences.</div>
          </div>
          <div className="hoverable" style={{ border: "1px solid var(--border)", background: "var(--bg)", borderRadius: 11, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            ↺ Restore Defaults
          </div>
        </div>
      )}
      <div style={card}>
        <div style={cardHeader}>Startup Behavior</div>
        <div style={row}>
          <div style={{ flex: 1 }}>
            <div style={rowTitle}>Open Chatter on system startup</div>
            <div style={rowDesc}>Automatically launch the app when you sign in to your computer.</div>
          </div>
          <Toggle on={s.startupLaunch} onChange={(v) => update.mutate({ startupLaunch: v })} label="Open on startup" />
        </div>
        <div style={row}>
          <div style={{ flex: 1 }}>
            <div style={rowTitle}>Open to</div>
            <div style={rowDesc}>Choose what to show when Chatter starts.</div>
          </div>
          <SegmentedControl
            options={["Chats", "Status", "Last Opened"] as const}
            value={s.openTo as "Chats"}
            onChange={(v) => update.mutate({ openTo: v })}
          />
        </div>
        <div style={{ ...row, borderBottom: "none" }}>
          <div style={{ flex: 1 }}>
            <div style={rowTitle}>Start minimized to system tray</div>
            <div style={rowDesc}>Keep Chatter running in the background when closed.</div>
          </div>
          <Toggle on={s.startTray} onChange={(v) => update.mutate({ startTray: v })} label="Start in tray" />
        </div>
      </div>
      <div style={card}>
        <div style={cardHeader}>Appearance</div>
        <div style={row}>
          <div style={{ flex: 1 }}>
            <div style={rowTitle}>Accent Color</div>
            <div style={rowDesc}>Choose your preferred accent color for highlights and controls.</div>
          </div>
          <div style={{ display: "flex", gap: 9 }}>
            {ACCENTS.map((a) => (
              <div
                key={a.id}
                onClick={() => update.mutate({ accent: a.id })}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  background: a.color,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 13,
                  boxShadow: s.accent === a.id ? `0 0 0 2px var(--bg), 0 0 0 4px ${a.color}` : "none",
                }}
              >
                {s.accent === a.id ? "✓" : ""}
              </div>
            ))}
          </div>
        </div>
        <div style={row}>
          <div style={{ flex: 1 }}>
            <div style={rowTitle}>Theme</div>
            <div style={rowDesc}>Select light, dark or system default theme.</div>
          </div>
          <SegmentedControl
            options={["Light", "Dark", "System"] as const}
            value={themeLabel as "Light"}
            onChange={(v) => update.mutate({ theme: v.toLowerCase() as "light" })}
          />
        </div>
        <div style={row}>
          <div style={{ flex: 1 }}>
            <div style={rowTitle}>Message Layout</div>
            <div style={rowDesc}>Choose how messages are aligned in chats.</div>
          </div>
          <SegmentedControl
            options={["Comfortable", "Compact"] as const}
            value={s.msgLayout as "Comfortable"}
            onChange={(v) => update.mutate({ msgLayout: v })}
          />
        </div>
        <div style={{ ...row, borderBottom: "none", gap: 20 }}>
          <div style={{ flex: 1 }}>
            <div style={rowTitle}>Font Size</div>
            <div style={rowDesc}>Adjust the size of text across the app.</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, width: isMobile ? 180 : 320 }}>
            <span style={{ fontSize: 12, color: "var(--text2)" }}>Small</span>
            <input
              type="range"
              min={12}
              max={17}
              value={s.fontSize}
              onChange={(e) => update.mutate({ fontSize: Number(e.target.value) })}
              style={{ flex: 1, accentColor: "var(--p600)" }}
            />
            <span style={{ fontSize: 12, color: "var(--text2)" }}>Large</span>
          </div>
        </div>
      </div>
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800 }}>Wallpaper</div>
            <div style={rowDesc}>Personalize your chat background.</div>
          </div>
          <div className="hoverable" style={{ border: "1px solid var(--border)", borderRadius: 11, padding: "8px 15px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
            ⬆ Upload Custom
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(3,1fr)" : "repeat(6,1fr)", gap: 12, padding: "16px 18px" }}>
          {WALLPAPERS.map((w) => {
            const sel = s.wallpaper === w.name;
            return (
              <div key={w.name} onClick={() => update.mutate({ wallpaper: w.name })} style={{ cursor: "pointer" }}>
                <div style={{ position: "relative", aspectRatio: "1.15", borderRadius: 13, background: w.bgc, border: `2.5px solid ${sel ? "var(--p500)" : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {w.none && (
                    <span style={{ width: 30, height: 30, borderRadius: "50%", border: "1.8px solid var(--text3)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text3)" }}>⃠</span>
                  )}
                  {sel && (
                    <span style={{ position: "absolute", right: 8, bottom: 8, width: 22, height: 22, borderRadius: "50%", background: "var(--p600)", color: "#fff", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>✓</span>
                  )}
                </div>
                <div style={{ textAlign: "center", fontSize: 11.5, color: "var(--text2)", marginTop: 6 }}>{w.name}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={card}>
        <div style={cardHeader}>Content Settings</div>
        <div style={{ ...row, borderBottom: "none" }}>
          <div style={{ flex: 1 }}>
            <div style={rowTitle}>Show message previews</div>
            <div style={rowDesc}>Display message content in notifications and chat list.</div>
          </div>
          <Toggle on={s.msgPreviews} onChange={(v) => update.mutate({ msgPreviews: v })} label="Message previews" />
        </div>
      </div>
    </div>
  );

  if (isMobile) return <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>{settingsBody}</div>;

  return (
    <>
      <div style={{ width: 280, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: "1px solid var(--border)", background: "var(--bg)", overflowY: "auto" }}>
        <div style={{ padding: "16px 18px 10px", fontSize: 16, fontWeight: 800 }}>Settings</div>
        <div style={{ padding: "0 10px 16px", display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV.map((sn) => (
            <div
              key={sn.name}
              className={sn.active ? undefined : "hoverable"}
              style={{ display: "flex", gap: 11, padding: "9px 11px", borderRadius: 12, cursor: "pointer", background: sn.active ? "var(--sel)" : "transparent" }}
            >
              <span style={{ opacity: 0.8, paddingTop: 1 }}>{sn.icon}</span>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: sn.active ? "var(--p600)" : "var(--text)" }}>{sn.name}</div>
                <div style={{ fontSize: 11.5, color: "var(--text2)", marginTop: 1 }}>{sn.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: "var(--bg-subtle)" }}>
        {settingsBody}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 26px", borderTop: "1px solid var(--border)", background: "var(--bg)" }}>
          <span style={{ fontSize: 12.5, color: "var(--text2)" }}>✓ Changes are saved automatically.</span>
          <div className="hover-p700" style={{ background: "var(--p600)", color: "#fff", fontSize: 13, fontWeight: 700, borderRadius: 11, padding: "10px 20px", cursor: "pointer" }}>
            Save Preferences
          </div>
        </div>
      </main>
    </>
  );
}

const card: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 15,
  marginTop: 16,
  boxShadow: "var(--shadow)",
};
const cardHeader: React.CSSProperties = { padding: "14px 18px", fontSize: 14, fontWeight: 800, borderBottom: "1px solid var(--border)" };
const row: React.CSSProperties = { display: "flex", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid var(--border)" };
const rowTitle: React.CSSProperties = { fontSize: 13.5, fontWeight: 700 };
const rowDesc: React.CSSProperties = { fontSize: 12, color: "var(--text2)", marginTop: 2 };
