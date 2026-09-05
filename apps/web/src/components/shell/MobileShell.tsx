"use client";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import type { MeDto } from "@chatter/contracts";
import { useConversation, useLogout } from "@/lib/queries";
import { ChatterLogo, LeaveIcon, MoonIcon, SunIcon } from "../icons";
import { routeTitles, useActiveRoute, useNavBadges, useThemeToggle } from "./AppShell";
import { useSettings } from "@/lib/queries";

const MORE_ROUTES = ["settings", "profile", "admin", "files", "contacts", "starred", "archived", "notifications"];

export function MobileShell({ me, children }: { me: MeDto; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const route = useActiveRoute();
  const slug = pathname.split("/")[3] ?? null;
  const inThread = route === "chats" && Boolean(slug);
  const conv = useConversation(inThread ? slug : null);
  const { unreadChats } = useNavBadges();
  const toggleTheme = useThemeToggle();
  const logout = useLogout();
  const settings = useSettings();
  const dark = settings.data?.theme === "dark";
  void me;

  const title = inThread ? (conv.data?.name ?? "…") : (routeTitles[route] ?? "Chatter");
  const sub = inThread ? conv.data?.subtitle : undefined;

  const nav = [
    { name: "Chats", icon: "💬", key: "chats", badge: unreadChats },
    { name: "Status", icon: "◎", key: "status" },
    { name: "Calls", icon: "📞", key: "calls" },
    { name: "Groups", icon: "👥", key: "groups" },
    { name: "More", icon: "⚙", key: "settings" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg)", fontSize: 14 }}>
      <header style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        {inThread ? (
          <button
            type="button"
            onClick={() => router.push("/app/chats")}
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: 18,
              color: "var(--text2)",
              marginLeft: -6,
              background: "none",
              border: "none",
            }}
          >
            ‹
          </button>
        ) : (
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              background: "linear-gradient(135deg,var(--p500),var(--p700))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ChatterLogo size={15} />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
          {sub && <div style={{ fontSize: 11.5, color: "var(--text2)" }}>{sub}</div>}
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          style={{ background: "none", border: "none", color: "var(--text2)", cursor: "pointer", display: "flex" }}
        >
          {dark ? <SunIcon size={18} /> : <MoonIcon size={18} />}
        </button>
        <button
          type="button"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          aria-label="Log out"
          title="Log out"
          style={{
            background: "none", border: "none", color: "var(--bad,#ef4457)", display: "flex",
            cursor: logout.isPending ? "wait" : "pointer", opacity: logout.isPending ? 0.5 : 1,
            minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "flex-end",
          }}
        >
          <LeaveIcon size={19} />
        </button>
      </header>
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>{children}</div>
      <nav
        style={{
          display: "flex",
          borderTop: "1px solid var(--border)",
          background: "var(--bg)",
          flexShrink: 0,
          padding: "6px 4px calc(6px + env(safe-area-inset-bottom))",
        }}
      >
        {nav.map((n) => {
          const active = route === n.key || (n.key === "settings" && MORE_ROUTES.includes(route));
          return (
            <button
              key={n.key}
              type="button"
              onClick={() => router.push(`/app/${n.key}`)}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                padding: "7px 0",
                cursor: "pointer",
                color: active ? "var(--accent-text)" : "var(--text2)",
                position: "relative",
                minHeight: 44,
                background: "none",
                border: "none",
              }}
            >
              <span style={{ fontSize: 19 }}>{n.icon}</span>
              <span style={{ fontSize: 10.5, fontWeight: 700 }}>{n.name}</span>
              {Boolean(n.badge) && (
                <span
                  style={{
                    position: "absolute",
                    top: 2,
                    right: "calc(50% - 22px)",
                    background: "var(--p600)",
                    color: "#fff",
                    fontSize: 9,
                    fontWeight: 700,
                    borderRadius: 99,
                    padding: "1px 5px",
                  }}
                >
                  {n.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
