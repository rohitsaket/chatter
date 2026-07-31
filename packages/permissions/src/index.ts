export type Role = "OWNER" | "ADMIN" | "MODERATOR" | "MEMBER" | "GUEST";

const RANK: Record<Role, number> = { OWNER: 5, ADMIN: 4, MODERATOR: 3, MEMBER: 2, GUEST: 1 };

export type Action =
  | "org.admin"          // access the admin module
  | "org.manage_members" // invite / change roles / suspend
  | "group.manage"       // rename group, manage members, pin
  | "group.announce"
  | "message.pin"
  | "message.delete_any"
  | "file.delete_any"
  | "audit.read"
  | "retention.manage";

const POLICY: Record<Action, Role> = {
  "org.admin": "ADMIN",
  "org.manage_members": "ADMIN",
  "group.manage": "MODERATOR",
  "group.announce": "MODERATOR",
  "message.pin": "MODERATOR",
  "message.delete_any": "MODERATOR",
  "file.delete_any": "ADMIN",
  "audit.read": "ADMIN",
  "retention.manage": "OWNER",
};

/** True when `role` is at least the minimum role required for `action`. */
export function can(role: Role, action: Action): boolean {
  return RANK[role] >= RANK[POLICY[action]];
}

/** True when `actor` outranks `target` (needed to change/suspend a member). */
export function outranks(actor: Role, target: Role): boolean {
  return RANK[actor] > RANK[target];
}

export function isAtLeast(role: Role, min: Role): boolean {
  return RANK[role] >= RANK[min];
}
