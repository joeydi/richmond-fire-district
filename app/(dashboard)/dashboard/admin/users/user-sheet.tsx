"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Mail, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { getLogDateParts } from "@/components/log/log-dates";
import { createUser, sendInviteEmail, updateUser, type UserActivity } from "@/lib/actions/users";
import type { Profile, UserRole } from "@/lib/types/database";
import { formatAgo, roleDots } from "./user-roles";

const roleOptions: { value: UserRole; label: string; note: string }[] = [
  { value: "member", label: "Member", note: "View only" },
  { value: "editor", label: "Editor", note: "Add and edit data" },
  { value: "admin", label: "Admin", note: "Full access, manage users" },
];

const labelClass = "font-mono text-[10px] font-normal tracking-[0.08em] text-muted-foreground uppercase";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">{children}</div>;
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <Button variant="ghost" size="icon" className="size-7 text-muted-foreground" onClick={onClose} title="Close (Esc)">
      <X className="size-4" />
      <span className="sr-only">Close</span>
    </Button>
  );
}

function RoleField({
  value,
  onChange,
  disabled,
  note,
}: {
  value: UserRole;
  onChange: (role: UserRole) => void;
  disabled?: boolean;
  note?: string;
}) {
  return (
    <fieldset className="flex flex-col gap-1.5" disabled={disabled}>
      <legend className={cn(labelClass, "mb-1.5")}>Role</legend>
      <div className="flex flex-col overflow-hidden rounded-md border">
        {roleOptions.map((option) => (
          <label
            key={option.value}
            className={cn(
              "flex cursor-pointer items-center gap-3 border-b px-3 py-2 last:border-b-0",
              value === option.value ? "bg-brand/10" : "hover:bg-zinc-50",
              disabled && "cursor-not-allowed opacity-60"
            )}
          >
            <input
              type="radio"
              name="role"
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="accent-brand"
            />
            <span className="text-[13px] font-medium">{option.label}</span>
            <span className="ml-auto font-mono text-[11px] text-muted-foreground">{option.note}</span>
          </label>
        ))}
      </div>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </fieldset>
  );
}

function Fact({ label, value, title }: { label: string; value: React.ReactNode; title?: string }) {
  return (
    <div className="flex min-h-7 items-center gap-2">
      <dt className="w-24 shrink-0 font-mono text-[10px] tracking-[0.06em] text-muted-foreground uppercase">{label}</dt>
      <dd className="min-w-0 flex-1 truncate font-mono text-xs" title={title}>
        {value}
      </dd>
    </div>
  );
}

interface UserSheetProps {
  user: Profile;
  activity: UserActivity;
  isOwnAccount: boolean;
  now: number;
  /** "2 / 4" */
  positionLabel: string | null;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}

export function UserSheet({
  user,
  activity,
  isOwnAccount,
  now,
  positionLabel,
  onClose,
  onPrev,
  onNext,
}: UserSheetProps) {
  const [name, setName] = useState(user.full_name || "");
  const [role, setRole] = useState<UserRole>(user.role);
  const [isSaving, startSaving] = useTransition();
  const [isInviting, startInviting] = useTransition();

  const hasChanges = name.trim() !== (user.full_name || "") || role !== user.role;
  const joined = getLogDateParts(user.created_at);
  const signIn = activity.lastSignInAt ? getLogDateParts(activity.lastSignInAt) : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startSaving(async () => {
      const result = await updateUser(user.id, {
        name: name.trim(),
        role: isOwnAccount ? undefined : role,
      });
      if (result.success) {
        toast.success("User updated");
      } else {
        toast.error(result.error || "Failed to update user");
      }
    });
  };

  const handleInvite = () => {
    startInviting(async () => {
      const result = await sendInviteEmail(user.id);
      if (result.success) {
        toast.success(`Sign-in link sent to ${user.email}`);
      } else {
        toast.error(result.error || "Failed to send sign-in link");
      }
    });
  };

  return (
    <aside aria-label={`${user.full_name || user.email} details`} className="flex h-full w-full flex-col bg-background">
      <div className="flex h-11 shrink-0 items-center gap-1 border-b px-2 pl-3">
        <Button variant="outline" size="icon" className="size-7" onClick={onPrev} disabled={!onPrev} title="Previous user (↑)">
          <ArrowUp className="size-3.5" />
          <span className="sr-only">Previous user</span>
        </Button>
        <Button variant="outline" size="icon" className="size-7" onClick={onNext} disabled={!onNext} title="Next user (↓)">
          <ArrowDown className="size-3.5" />
          <span className="sr-only">Next user</span>
        </Button>
        <span className="ml-1.5 flex-1 font-mono text-[11px] text-muted-foreground">{positionLabel}</span>
        <CloseButton onClose={onClose} />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-1 px-4 pt-3.5 pb-3">
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.06em] text-zinc-700 uppercase">
            <span className={cn("size-1.5 rounded-full", roleDots[user.role])} />
            {user.role}
            {isOwnAccount && <span className="text-muted-foreground">· You</span>}
          </span>
          <h2 className="text-[17px] font-semibold tracking-tight">{user.full_name || "No name"}</h2>
          <a href={`mailto:${user.email}`} className="self-start font-mono text-xs text-zinc-600 underline-offset-2 hover:underline">
            {user.email}
          </a>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 border-t border-zinc-100 px-4 py-3.5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="user-name" className={labelClass}>
              Name
            </Label>
            <Input
              id="user-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSaving}
              placeholder="Full name"
              className="h-8 text-[13px]"
            />
          </div>

          <RoleField
            value={role}
            onChange={setRole}
            disabled={isSaving || isOwnAccount}
            note={isOwnAccount ? "You can’t change your own role." : undefined}
          />

          <div className="flex gap-2">
            <Button type="submit" size="sm" className="h-7 px-2.5 text-xs" disabled={isSaving || !hasChanges}>
              {isSaving ? "Saving…" : "Save changes"}
            </Button>
            {hasChanges && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2.5 text-xs"
                disabled={isSaving}
                onClick={() => {
                  setName(user.full_name || "");
                  setRole(user.role);
                }}
              >
                Discard
              </Button>
            )}
          </div>
        </form>

        <section aria-label="Access" className="flex flex-col gap-1.5 border-t border-zinc-100 px-4 py-3">
          <SectionLabel>Access</SectionLabel>
          <dl className="flex flex-col">
            <Fact
              label="Last sign-in"
              value={
                signIn ? (
                  `${formatAgo(activity.lastSignInAt!, now)} · ${signIn.date} ${signIn.time}`
                ) : (
                  <span className="text-amber-700">NEVER</span>
                )
              }
            />
            <Fact label="Joined" value={joined.date} />
          </dl>
          <Button
            variant="outline"
            size="sm"
            className="mt-1 h-7 self-start px-2.5 text-xs"
            onClick={handleInvite}
            disabled={isInviting}
          >
            <Mail className="size-3.5" />
            {isInviting ? "Sending…" : "Send sign-in link"}
          </Button>
        </section>

        <section aria-label="Activity" className="flex flex-col gap-1.5 border-t border-zinc-100 px-4 py-3">
          <SectionLabel>Activity · last 30 days</SectionLabel>
          <dl className="flex flex-col">
            <Fact label="Readings" value={activity.readings30d || <span className="text-muted-foreground">—</span>} />
            <Fact label="Log posts" value={activity.posts30d || <span className="text-muted-foreground">—</span>} />
            <Fact
              label="Last entry"
              value={
                activity.lastEntryAt ? (
                  formatAgo(activity.lastEntryAt, now)
                ) : (
                  <span className="text-muted-foreground">—</span>
                )
              }
            />
          </dl>
        </section>
      </div>

      <div className="hidden h-9 shrink-0 items-center border-t px-4 font-mono text-[10px] text-muted-foreground lg:flex">
        ESC CLOSE · ↑↓ NAVIGATE
      </div>
    </aside>
  );
}

interface NewUserSheetProps {
  onClose: () => void;
  onCreated: (id: string | null) => void;
}

export function NewUserSheet({ onClose, onCreated }: NewUserSheetProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("member");
  const [sendLink, setSendLink] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await createUser(email.trim(), name.trim(), role);
      if (!result.success) {
        toast.error(result.error || "Failed to create user");
        return;
      }
      if (sendLink && result.id) {
        const invite = await sendInviteEmail(result.id);
        if (invite.success) {
          toast.success(`User created · sign-in link sent to ${email.trim()}`);
        } else {
          toast.warning(`User created, but the sign-in link failed: ${invite.error}`);
        }
      } else {
        toast.success("User created");
      }
      onCreated(result.id ?? null);
    });
  };

  return (
    <aside aria-label="New user" className="flex h-full w-full flex-col bg-background">
      <div className="flex h-11 shrink-0 items-center gap-1 border-b px-2 pl-4">
        <span className="flex-1 font-mono text-[11px] tracking-[0.06em] text-muted-foreground uppercase">New user</span>
        <CloseButton onClose={onClose} />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
        <div className="flex flex-col gap-4 px-4 py-3.5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-user-name" className={labelClass}>
              Name
            </Label>
            <Input
              id="new-user-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
              placeholder="Full name"
              className="h-8 text-[13px]"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-user-email" className={labelClass}>
              Email
            </Label>
            <Input
              id="new-user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isPending}
              placeholder="user@example.com"
              required
              className="h-8 font-mono text-[13px]"
            />
          </div>

          <RoleField value={role} onChange={setRole} disabled={isPending} />

          <label className="flex cursor-pointer items-start gap-2 text-xs">
            <input
              type="checkbox"
              checked={sendLink}
              onChange={(e) => setSendLink(e.target.checked)}
              disabled={isPending}
              className="mt-0.5 accent-brand"
            />
            <span>
              Email them a sign-in link now
              <span className="block text-muted-foreground">Otherwise no email is sent; you can send one later.</span>
            </span>
          </label>
        </div>

        <div className="mt-auto flex gap-2 border-t px-4 py-3">
          <Button type="submit" size="sm" className="h-7 px-2.5 text-xs" disabled={isPending || !email.trim()}>
            {isPending ? "Creating…" : "Create user"}
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2.5 text-xs" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
        </div>
      </form>
    </aside>
  );
}
