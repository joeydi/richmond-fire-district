"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Mail, Pencil } from "lucide-react";
import { sendInviteEmail, type UserActivity } from "@/lib/actions/users";
import { getLogDateParts } from "@/components/log/log-dates";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Profile, UserRole } from "@/lib/types/database";
import { CreateUserDialog } from "./create-user-dialog";

interface UsersTableProps {
  users: Profile[];
  activity: Record<string, UserActivity>;
  currentUserId: string;
  /** Request time, so relative times match between server and client */
  now: number;
}

const ROLES: UserRole[] = ["admin", "editor", "member"];

const roleDots: Record<UserRole, string> = {
  admin: "bg-red-600",
  editor: "bg-brand",
  member: "bg-zinc-400",
};

const roleNotes: Record<UserRole, string> = {
  admin: "Full access",
  editor: "Add / edit data",
  member: "View only",
};

const NO_ACTIVITY: UserActivity = { lastSignInAt: null, readings30d: 0, posts30d: 0, lastEntryAt: null };

const thClass =
  "border-b bg-zinc-50 px-2 py-1.5 text-left font-mono text-[10px] font-medium tracking-[0.06em] whitespace-nowrap text-muted-foreground uppercase first:pl-4 last:pr-4";
const tdClass = "px-2 py-[7px] first:pl-4 last:pr-4";

function formatAgo(iso: string, now: number): string {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return getLogDateParts(iso).date;
}

function RoleLabel({ role }: { role: UserRole }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] whitespace-nowrap text-zinc-700 uppercase">
      <span className={cn("size-1.5 rounded-full", roleDots[role])} />
      {role}
    </span>
  );
}

function LastSignIn({ at, now }: { at: string | null; now: number }) {
  if (!at) {
    return <span className="font-mono text-[11px] text-amber-700">NEVER</span>;
  }
  const { date, time } = getLogDateParts(at);
  return (
    <span className="font-mono text-[11px] whitespace-nowrap text-zinc-700" title={`${date} ${time}`}>
      {formatAgo(at, now)}
    </span>
  );
}

function Entries({ activity }: { activity: UserActivity }) {
  const total = activity.readings30d + activity.posts30d;
  if (total === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <span
      className="font-mono"
      title={`${activity.readings30d} readings · ${activity.posts30d} log posts in the last 30 days`}
    >
      {activity.readings30d}
      <span className="text-muted-foreground"> / </span>
      {activity.posts30d}
    </span>
  );
}

export function UsersTable({ users, activity, currentUserId, now }: UsersTableProps) {
  const [sendingInvite, setSendingInvite] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");

  const counts = Object.fromEntries(ROLES.map((role) => [role, users.filter((u) => u.role === role).length]));
  const visible = roleFilter === "all" ? users : users.filter((user) => user.role === roleFilter);
  const neverSignedIn = users.filter((user) => !activity[user.id]?.lastSignInAt).length;

  const handleSendInvite = async (user: Profile) => {
    setSendingInvite(user.id);
    try {
      const result = await sendInviteEmail(user.id);
      if (result.success) {
        toast.success(`Sign-in link sent to ${user.email}`);
      } else {
        toast.error(result.error || "Failed to send invite");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setSendingInvite(null);
    }
  };

  const actions = (user: Profile) => (
    <div className="flex justify-end gap-0.5">
      <Button
        variant="ghost"
        size="icon"
        className="size-6 text-muted-foreground"
        onClick={() => handleSendInvite(user)}
        disabled={sendingInvite === user.id}
        title="Send sign-in link"
      >
        <Mail className="size-3" />
        <span className="sr-only">Send sign-in link to {user.email}</span>
      </Button>
      <Button variant="ghost" size="icon" className="size-6 text-muted-foreground" asChild>
        <Link href={`/dashboard/admin/users/${user.id}/edit`} title="Edit user">
          <Pencil className="size-3" />
          <span className="sr-only">Edit {user.full_name || user.email}</span>
        </Link>
      </Button>
    </div>
  );

  const name = (user: Profile) => (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn(!user.full_name && "text-muted-foreground")}>{user.full_name || "No name"}</span>
      {user.id === currentUserId && (
        <span className="rounded-sm bg-zinc-100 px-1 font-mono text-[9px] tracking-[0.06em] text-zinc-600">YOU</span>
      )}
    </span>
  );

  return (
    <div data-flush className="flex min-h-full flex-col">
      {/* Toolbar */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b bg-background px-4 py-2">
        <div role="group" aria-label="Filter by role" className="flex gap-0.5 rounded-md bg-muted p-0.5 font-mono text-[11px]">
          {(["all", ...ROLES] as const).map((role) => (
            <button
              key={role}
              type="button"
              aria-pressed={roleFilter === role}
              onClick={() => setRoleFilter(role)}
              className={cn(
                "flex h-6 items-center gap-1 rounded-sm px-2 uppercase",
                roleFilter === role
                  ? "bg-background font-medium shadow-[0_0_0_1px_var(--border)]"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {role}
              <span className="text-muted-foreground">{role === "all" ? users.length : counts[role]}</span>
            </button>
          ))}
        </div>

        <div className="flex-1" />
        {neverSignedIn > 0 && (
          <span className="hidden font-mono text-[11px] text-amber-700 sm:inline">
            {neverSignedIn} NEVER SIGNED IN
          </span>
        )}
        <CreateUserDialog />
      </div>

      {visible.length === 0 ? (
        <p className="flex-1 px-4 py-16 text-center text-xs text-muted-foreground">No users with this role.</p>
      ) : (
        <>
          {/* Phones: stacked list */}
          <ul className="flex-1 sm:hidden">
            {visible.map((user) => {
              const userActivity = activity[user.id] ?? NO_ACTIVITY;
              return (
                <li key={user.id} className="flex items-start gap-3 border-b border-zinc-100 px-4 py-2.5">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-center gap-2 text-[13px] font-medium">
                      {name(user)}
                      <RoleLabel role={user.role} />
                    </div>
                    <span className="truncate font-mono text-xs text-zinc-600">{user.email}</span>
                    <span className="flex gap-3 font-mono text-[11px] text-muted-foreground">
                      <span>
                        SIGN-IN <LastSignIn at={userActivity.lastSignInAt} now={now} />
                      </span>
                      <span>
                        30D <Entries activity={userActivity} />
                      </span>
                    </span>
                  </div>
                  {actions(user)}
                </li>
              );
            })}
          </ul>

          {/* Larger screens: table */}
          <div className="relative hidden flex-1 overflow-x-auto sm:block">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className={thClass}>Name</th>
                  <th className={thClass}>Email</th>
                  <th className={thClass}>Role</th>
                  <th className={thClass}>Last sign-in</th>
                  <th className={cn(thClass, "text-right")} title="Readings / log posts entered in the last 30 days">
                    Readings / posts · 30d
                  </th>
                  <th className={cn(thClass, "hidden md:table-cell")}>Last entry</th>
                  <th className={cn(thClass, "hidden lg:table-cell")}>Joined</th>
                  <th className={cn(thClass, "w-16")}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((user) => {
                  const userActivity = activity[user.id] ?? NO_ACTIVITY;
                  return (
                    <tr key={user.id} className="group border-b border-zinc-100 transition-colors hover:bg-zinc-50/70">
                      <td className={cn(tdClass, "font-medium whitespace-nowrap")}>{name(user)}</td>
                      <td className={cn(tdClass, "max-w-[240px] truncate font-mono text-zinc-700")}>
                        <a href={`mailto:${user.email}`} className="underline-offset-2 hover:text-foreground hover:underline">
                          {user.email}
                        </a>
                      </td>
                      <td className={tdClass} title={roleNotes[user.role]}>
                        <RoleLabel role={user.role} />
                      </td>
                      <td className={tdClass}>
                        <LastSignIn at={userActivity.lastSignInAt} now={now} />
                      </td>
                      <td className={cn(tdClass, "text-right")}>
                        <Entries activity={userActivity} />
                      </td>
                      <td className={cn(tdClass, "hidden font-mono text-[11px] text-zinc-700 md:table-cell")}>
                        {userActivity.lastEntryAt ? (
                          formatAgo(userActivity.lastEntryAt, now)
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className={cn(tdClass, "hidden font-mono text-[11px] text-zinc-700 lg:table-cell")}>
                        {getLogDateParts(user.created_at).date}
                      </td>
                      <td className={cn(tdClass, "py-0")}>
                        <div className="transition-opacity lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100">
                          {actions(user)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="flex h-8 items-center gap-4 border-t px-4 font-mono text-[10px] tracking-[0.06em] text-muted-foreground uppercase">
        {ROLES.map((role) => (
          <span key={role} className="inline-flex items-center gap-1.5">
            <span className={cn("size-1.5 rounded-full", roleDots[role])} />
            {role} · {roleNotes[role]}
          </span>
        ))}
      </div>
    </div>
  );
}
