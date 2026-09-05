"use client";
import Link from "next/link";
import * as React from "react";
import type { MeDto } from "@chatter/contracts";
import { Avatar } from "@chatter/ui";
import { useAdminStorage, useLogout } from "@/lib/queries";
import { formatBytes } from "@/lib/format";
import {
  AdminIcon,
  ArchiveIcon,
  BellIcon,
  ChatIcon,
  ChatterLogo,
  ContactsIcon,
  FilesIcon,
  GearIcon,
  GroupsIcon,
  LeaveIcon,
  MoonIcon,
  PhoneIcon,
  ProfileIcon,
  StarIcon,
  StatusIcon,
  SunIcon,
} from "../icons";
import { useActiveRoute, useNavBadges, useThemeToggle } from "./AppShell";
import { useSettings } from "@/lib/queries";
import { SIDEBAR_COLLAPSED_KEY, useUiStore } from "@/lib/store";

const EXPANDED_WIDTH = 218;
const COLLAPSED_WIDTH = 68;

/** Chevron pointing left when expanded (collapse) and right when collapsed. */
function ChevronIcon({ pointRight }: { pointRight: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {pointRight ? <path d="M8 5l5 5-5 5" /> : <path d="M12 5l-5 5 5 5" />}
    </svg>
  );
}

function NavItem({
  route,
  label,
  icon,
  badge,
  badgeBg,
  collapsed,
}: {
  route: string;
  label: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  badgeBg?: string;
  collapsed: boolean;
}) {
  const active = useActiveRoute() === route;
  const hasBadge = badge != null && badge !== 0;
  return (
    <Link
      href={`/app/${route}`}
      // The label is the only accessible name once it is visually hidden.
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      className={active ? undefined : "hoverable"}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: collapsed ? "center" : "flex-start",
        gap: collapsed ? 0 : 11,
        padding: collapsed ? "11px 0" : "9px 11px",
        borderRadius: 11,
        cursor: "pointer",
        fontWeight: 600,
        background: active ? "var(--sel)" : "transparent",
        color: active ? "var(--accent-text)" : "var(--text)",
        textDecoration: "none",
      }}
    >
      {icon}
      {!collapsed && <span style={{ flex: 1 }}>{label}</span>}
      {hasBadge &&
        (collapsed ? (
          // Counts stay readable on the rail; non-numeric badges ("New")
          // become a dot so they cannot overflow 68px.
          typeof badge === "number" ? (
            <span
              style={{
                position: "absolute", top: 3, right: 8,
                background: badgeBg ?? "var(--p600)", color: "#fff",
                fontSize: 9, fontWeight: 700, lineHeight: 1.5,
                borderRadius: 99, padding: "0 4px", minWidth: 14, textAlign: "center",
              }}
            >
              {badge}
            </span>
          ) : (
            <span
              aria-hidden="true"
              style={{ position: "absolute", top: 7, right: 12, width: 7, height: 7, borderRadius: 99, background: badgeBg ?? "var(--p600)" }}
            />
          )
        ) : (
          <span
            style={{
              background: badgeBg ?? "var(--p600)",
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              borderRadius: 99,
              padding: "2px 7px",
            }}
          >
            {badge}
          </span>
        ))}
    </Link>
  );
}

export function PrimarySidebar({ me }: { me: MeDto }) {
  const { unreadChats, unreadNotifs } = useNavBadges();
  const toggleTheme = useThemeToggle();
  const logout = useLogout();
  const settings = useSettings();
  const isAdmin = me.orgRole === "OWNER" || me.orgRole === "ADMIN";
  // Admin-only endpoint — don't fire it for members, and never show a fabricated
  // "0 B of 10 GB" when the real figure is unavailable.
  const storage = useAdminStorage(isAdmin);
  const used = storage.data?.usedBytes ?? 0;
  const quota = storage.data?.quotaBytes ?? 0;
  const dark = settings.data?.theme === "dark";

  const { sidebarCollapsed: collapsed, setSidebarCollapsed } = useUiStore();

  // Restore the saved preference after mount. Reading storage during render
  // would diverge from the server render; this component is client-only, but
  // the effect keeps that guarantee explicit.
  React.useEffect(() => {
    try {
      if (window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1") setSidebarCollapsed(true);
    } catch {
      /* storage unavailable (private mode) — keep the default */
    }
  }, [setSidebarCollapsed]);

  function toggle() {
    const next = !collapsed;
    setSidebarCollapsed(next);
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
    } catch {
      /* preference simply will not persist */
    }
  }

  const toggleButton = (
    <button
      type="button"
      onClick={toggle}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      aria-expanded={!collapsed}
      title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      className="hoverable"
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 30, height: 30, borderRadius: 9, cursor: "pointer",
        background: "none", border: "1px solid var(--border)", color: "var(--text2)", padding: 0,
      }}
    >
      <ChevronIcon pointRight={collapsed} />
    </button>
  );

  return (
    <nav
      style={{
        width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid var(--border)",
        background: "var(--bg)",
        transition: "width 160ms ease",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: collapsed ? "18px 0 10px" : "18px 18px 14px",
          justifyContent: collapsed ? "center" : "flex-start",
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            background: "linear-gradient(135deg,var(--p500),var(--p700))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 10px -2px var(--p300)",
            flexShrink: 0,
          }}
        >
          <ChatterLogo />
        </div>
        {!collapsed && (
          <>
            <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-.02em" }}>Chatter</div>
            <div style={{ marginLeft: "auto" }}>{toggleButton}</div>
          </>
        )}
      </div>
      {collapsed ? (
        <div style={{ display: "flex", justifyContent: "center", paddingBottom: 10 }}>{toggleButton}</div>
      ) : (
        <div style={{ padding: "2px 18px 6px", fontSize: 11, fontWeight: 600, color: "var(--text3)", letterSpacing: ".04em" }}>Menu</div>
      )}
      <div style={{ flex: 1, overflowY: "auto", padding: collapsed ? "0 10px" : "0 10px", display: "flex", flexDirection: "column", gap: 2 }}>
        <NavItem route="chats" label="Chats" icon={<ChatIcon />} badge={unreadChats || undefined} collapsed={collapsed} />
        <NavItem route="status" label="Status" icon={<StatusIcon />} collapsed={collapsed} />
        <NavItem route="calls" label="Calls" icon={<PhoneIcon />} badge="New" badgeBg="var(--p500)" collapsed={collapsed} />
        <NavItem route="groups" label="Groups" icon={<GroupsIcon />} collapsed={collapsed} />
        <NavItem route="contacts" label="Contacts" icon={<ContactsIcon />} collapsed={collapsed} />
        <NavItem route="files" label="Files" icon={<FilesIcon />} collapsed={collapsed} />
        <NavItem route="starred" label="Starred" icon={<StarIcon />} collapsed={collapsed} />
        <NavItem route="archived" label="Archived" icon={<ArchiveIcon />} collapsed={collapsed} />
        <NavItem route="notifications" label="Notifications" icon={<BellIcon />} badge={unreadNotifs || undefined} collapsed={collapsed} />
        <NavItem
          route="settings"
          label="Settings"
          icon={<GearIcon />}
          collapsed={collapsed}
        />
        {isAdmin && <NavItem route="admin" label="Admin" icon={<AdminIcon />} collapsed={collapsed} />}
        <NavItem route="profile" label="Profile" icon={<ProfileIcon />} collapsed={collapsed} />
      </div>
      {quota > 0 && !collapsed && (
        <div style={{ padding: "14px 18px 6px", borderTop: "1px solid var(--border)" }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--text3)", letterSpacing: ".06em", marginBottom: 9 }}>STORAGE</div>
          <div style={{ height: 6, borderRadius: 99, background: "var(--muted)", overflow: "hidden" }}>
            <div style={{ width: `${Math.min(100, (used / quota) * 100)}%`, height: "100%", borderRadius: 99, background: "var(--p600)" }} />
          </div>
          <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 8 }}>
            {formatBytes(used)} of {formatBytes(quota)} used
          </div>
        </div>
      )}
      <div
        style={{
          display: "flex",
          flexDirection: collapsed ? "column" : "row",
          alignItems: "center",
          gap: collapsed ? 12 : 10,
          padding: collapsed ? "14px 0" : "14px 16px",
          borderTop: "1px solid var(--border)",
        }}
      >
        <Link
          href="/app/profile"
          title={collapsed ? `${me.name} — Profile` : undefined}
          aria-label={collapsed ? `${me.name} — Profile` : undefined}
          style={{ position: "relative", cursor: "pointer" }}
        >
          <Avatar name={me.name} color={me.avatarColor} size={collapsed ? 34 : 38} fontSize={collapsed ? 12 : 13} online />
        </Link>
        {!collapsed && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>{me.name}</div>
            <div style={{ fontSize: 12, color: "var(--text2)" }}>Online</div>
          </div>
        )}
        {/* No Settings link here — the nav list above already has one, and in the
            collapsed rail the two gears sat directly above each other. */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: collapsed ? 12 : 6, color: "var(--text2)" }}>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title="Toggle theme"
            style={{ background: "none", border: "none", padding: 0, color: "inherit", cursor: "pointer", display: "flex" }}
          >
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>
          <button
            type="button"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            aria-label="Log out"
            title={`Log out of ${me.name}`}
            style={{
              background: "none", border: "none", padding: 0, cursor: logout.isPending ? "wait" : "pointer",
              display: "flex", color: "var(--bad,#ef4457)", opacity: logout.isPending ? 0.5 : 1,
            }}
          >
            <LeaveIcon size={17} />
          </button>
        </div>
      </div>
    </nav>
  );
}
