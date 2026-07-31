"use client";
import Link from "next/link";
import * as React from "react";
import type { MeDto } from "@chatter/contracts";
import { Avatar, Badge } from "@chatter/ui";
import { useAdminStorage } from "@/lib/queries";
import { formatBytes } from "@/lib/format";
import {
  AdminIcon,
  ArchiveIcon,
  BellIcon,
  ChatIcon,
  ChatterLogo,
  ContactsIcon,
  FilesIcon,
  GroupsIcon,
  MoonIcon,
  PhoneIcon,
  ProfileIcon,
  StarIcon,
  StatusIcon,
  SunIcon,
} from "../icons";
import { useActiveRoute, useNavBadges, useThemeToggle } from "./AppShell";
import { useSettings } from "@/lib/queries";

const gearSmall = (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
    <circle cx="10" cy="10" r="2.4" />
    <path
      d="M10 3v1.6M10 15.4V17M17 10h-1.6M4.6 10H3M14.9 5.1l-1.1 1.1M6.2 13.8l-1.1 1.1M14.9 14.9l-1.1-1.1M6.2 6.2L5.1 5.1"
      strokeLinecap="round"
    />
  </svg>
);

function NavItem({
  route,
  label,
  icon,
  badge,
  badgeBg,
}: {
  route: string;
  label: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  badgeBg?: string;
}) {
  const active = useActiveRoute() === route;
  return (
    <Link
      href={`/app/${route}`}
      className={active ? undefined : "hoverable"}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 11,
        padding: "9px 11px",
        borderRadius: 11,
        cursor: "pointer",
        fontWeight: 600,
        background: active ? "var(--sel)" : "transparent",
        color: active ? "var(--p600)" : "var(--text)",
        textDecoration: "none",
      }}
    >
      {icon}
      <span style={{ flex: 1 }}>{label}</span>
      {badge != null && badge !== 0 && (
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
      )}
    </Link>
  );
}

export function PrimarySidebar({ me }: { me: MeDto }) {
  const { unreadChats, unreadNotifs } = useNavBadges();
  const toggleTheme = useThemeToggle();
  const settings = useSettings();
  const isAdmin = me.orgRole === "OWNER" || me.orgRole === "ADMIN";
  const storage = useAdminStorage();
  const used = storage.data?.usedBytes ?? 0;
  const quota = storage.data?.quotaBytes ?? 10 * 1024 ** 3;
  const dark = settings.data?.theme === "dark";

  return (
    <nav style={{ width: 218, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: "1px solid var(--border)", background: "var(--bg)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 18px 14px" }}>
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
          }}
        >
          <ChatterLogo />
        </div>
        <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-.02em" }}>Chatter</div>
      </div>
      <div style={{ padding: "2px 18px 6px", fontSize: 11, fontWeight: 600, color: "var(--text3)", letterSpacing: ".04em" }}>Menu</div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 10px", display: "flex", flexDirection: "column", gap: 2 }}>
        <NavItem route="chats" label="Chats" icon={<ChatIcon />} badge={unreadChats || undefined} />
        <NavItem route="status" label="Status" icon={<StatusIcon />} />
        <NavItem route="calls" label="Calls" icon={<PhoneIcon />} badge="New" badgeBg="var(--p500)" />
        <NavItem route="groups" label="Groups" icon={<GroupsIcon />} />
        <NavItem route="contacts" label="Contacts" icon={<ContactsIcon />} />
        <NavItem route="files" label="Files" icon={<FilesIcon />} />
        <NavItem route="starred" label="Starred" icon={<StarIcon />} />
        <NavItem route="archived" label="Archived" icon={<ArchiveIcon />} />
        <NavItem route="notifications" label="Notifications" icon={<BellIcon />} badge={unreadNotifs || undefined} />
        <NavItem
          route="settings"
          label="Settings"
          icon={
            <svg width="19" height="19" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="10" cy="10" r="2.4" />
              <path
                d="M16.2 12.5a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-1.8-.3 1.6 1.6 0 00-1 1.5v.2a2 2 0 11-3.9 0v-.1a1.6 1.6 0 00-1-1.5 1.6 1.6 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00.3-1.8 1.6 1.6 0 00-1.5-1h-.2a2 2 0 110-3.9h.1a1.6 1.6 0 001.5-1 1.6 1.6 0 00-.3-1.8l-.1-.1A2 2 0 116 2.1l.1.1a1.6 1.6 0 001.8.3h.1a1.6 1.6 0 001-1.5v-.2a2 2 0 013.9 0v.1a1.6 1.6 0 001 1.5 1.6 1.6 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.8v.1a1.6 1.6 0 001.5 1h.2a2 2 0 010 3.9h-.1a1.6 1.6 0 00-1.5 1z"
                transform="scale(.86) translate(1.6 1.6)"
              />
            </svg>
          }
        />
        {isAdmin && <NavItem route="admin" label="Admin" icon={<AdminIcon />} />}
        <NavItem route="profile" label="Profile" icon={<ProfileIcon />} />
      </div>
      <div style={{ padding: "14px 18px 6px", borderTop: "1px solid var(--border)" }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--text3)", letterSpacing: ".06em", marginBottom: 9 }}>STORAGE</div>
        <div style={{ height: 6, borderRadius: 99, background: "var(--muted)", overflow: "hidden" }}>
          <div style={{ width: `${Math.min(100, (used / quota) * 100)}%`, height: "100%", borderRadius: 99, background: "var(--p600)" }} />
        </div>
        <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 8 }}>
          {formatBytes(used)} of {formatBytes(quota)} used
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderTop: "1px solid var(--border)" }}>
        <Link href="/app/profile" style={{ position: "relative", cursor: "pointer" }}>
          <Avatar name={me.name} color={me.avatarColor} size={38} fontSize={13} online />
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5 }}>{me.name}</div>
          <div style={{ fontSize: 12, color: "var(--text2)" }}>Online</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, color: "var(--text2)" }}>
          <Link href="/app/settings" style={{ color: "inherit", display: "flex" }}>
            {gearSmall}
          </Link>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            style={{ background: "none", border: "none", padding: 0, color: "inherit", cursor: "pointer", display: "flex" }}
          >
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </div>
    </nav>
  );
}
