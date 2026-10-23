"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateUser } from "@/lib/actions/users";
import { getLogDateParts } from "@/components/log/log-dates";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Profile, UserRole } from "@/lib/types/database";

interface EditUserFormProps {
  user: Profile;
  isOwnAccount: boolean;
}

const roleOptions: { value: UserRole; label: string; note: string }[] = [
  { value: "member", label: "Member", note: "View only" },
  { value: "editor", label: "Editor", note: "Add and edit data" },
  { value: "admin", label: "Admin", note: "Full access, manage users" },
];

const labelClass = "font-mono text-[10px] font-normal tracking-[0.08em] text-muted-foreground uppercase";

export function EditUserForm({ user, isOwnAccount }: EditUserFormProps) {
  const [name, setName] = useState(user.full_name || "");
  const [role, setRole] = useState<UserRole>(user.role);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const hasChanges = name !== (user.full_name || "") || role !== user.role;
  const joined = getLogDateParts(user.created_at);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await updateUser(user.id, {
        name,
        role: isOwnAccount ? undefined : role,
      });
      if (result.success) {
        toast.success("User updated successfully");
        router.push("/dashboard/admin/users");
      } else {
        toast.error(result.error || "Failed to update user");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-[17px] font-semibold tracking-tight">{user.full_name || user.email}</h1>
        <p className="font-mono text-[11px] text-muted-foreground">
          {user.email} · JOINED {joined.date}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name" className={labelClass}>
          Name
        </Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
          placeholder="Full name"
        />
      </div>

      <fieldset className="flex flex-col gap-1.5" disabled={loading || isOwnAccount}>
        <legend className={cn(labelClass, "mb-1.5")}>Role</legend>
        <div className="flex flex-col overflow-hidden rounded-md border">
          {roleOptions.map((option) => (
            <label
              key={option.value}
              className={cn(
                "flex cursor-pointer items-center gap-3 border-b px-3 py-2 last:border-b-0",
                role === option.value ? "bg-brand/10" : "hover:bg-zinc-50",
                isOwnAccount && "cursor-not-allowed opacity-60"
              )}
            >
              <input
                type="radio"
                name="role"
                value={option.value}
                checked={role === option.value}
                onChange={() => setRole(option.value)}
                className="accent-brand"
              />
              <span className="text-sm font-medium">{option.label}</span>
              <span className="ml-auto font-mono text-[11px] text-muted-foreground">{option.note}</span>
            </label>
          ))}
        </div>
        {isOwnAccount && (
          <p className="text-xs text-muted-foreground">You can’t change your own role.</p>
        )}
      </fieldset>

      <div className="flex gap-2 border-t pt-4">
        <Button type="submit" size="sm" disabled={loading || !hasChanges}>
          {loading ? "Saving…" : "Save changes"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => router.back()} disabled={loading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
