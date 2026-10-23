import { getLogDateParts } from "@/components/log/log-dates";
import type { UserActivity } from "@/lib/actions/users";
import type { UserRole } from "@/lib/types/database";

export const ROLES: UserRole[] = ["admin", "editor", "member"];

export const roleDots: Record<UserRole, string> = {
  admin: "bg-red-600",
  editor: "bg-brand",
  member: "bg-zinc-400",
};

export const roleNotes: Record<UserRole, string> = {
  admin: "Full access",
  editor: "Add / edit data",
  member: "View only",
};

export const NO_ACTIVITY: UserActivity = { lastSignInAt: null, readings30d: 0, posts30d: 0, lastEntryAt: null };

export function formatAgo(iso: string, now: number): string {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return getLogDateParts(iso).date;
}
