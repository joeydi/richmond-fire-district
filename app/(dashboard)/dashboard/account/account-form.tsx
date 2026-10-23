"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, LogOut, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SettingsSection, settingsLabelClass } from "@/components/settings/settings-nav";
import { cn } from "@/lib/utils";
import { updateOwnProfile, updatePassword } from "@/lib/actions/users";
import { logout } from "@/lib/actions/auth";
import type { UserRole } from "@/lib/types/database";

const MIN_PASSWORD_LENGTH = 6;

const roleNotes: Record<UserRole, string> = {
  admin: "Full access, including user management",
  editor: "Can add and edit data",
  member: "View only",
};

interface AccountFormProps {
  user: {
    id: string;
    email: string;
    full_name: string | null;
    role: UserRole;
  };
}

function Requirement({ met, children }: { met: boolean; children: React.ReactNode }) {
  return (
    <li className={cn("flex items-center gap-1.5", met ? "text-zinc-700" : "text-muted-foreground")}>
      {met ? <Check className="size-3 text-emerald-600" /> : <X className="size-3" />}
      {children}
    </li>
  );
}

export function AccountForm({ user }: AccountFormProps) {
  const [name, setName] = useState(user.full_name || "");
  const [savedName, setSavedName] = useState(user.full_name || "");
  const [isSaving, startSaving] = useTransition();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, startChangingPassword] = useTransition();
  const [isSigningOut, startSigningOut] = useTransition();

  const nameChanged = name.trim() !== savedName;
  const longEnough = newPassword.length >= MIN_PASSWORD_LENGTH;
  const matches = newPassword.length > 0 && newPassword === confirmPassword;
  const canChangePassword = currentPassword.length > 0 && longEnough && matches;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    startSaving(async () => {
      const result = await updateOwnProfile({ name: name.trim() });
      if (result.success) {
        setSavedName(name.trim());
        toast.success("Profile updated");
      } else {
        toast.error(result.error || "Failed to update profile");
      }
    });
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canChangePassword) return;
    startChangingPassword(async () => {
      const result = await updatePassword({ currentPassword, newPassword });
      if (result.success) {
        toast.success("Password updated");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast.error(result.error || "Failed to update password");
      }
    });
  };

  return (
    <div className="flex flex-col">
      <form onSubmit={handleSaveProfile}>
        <SettingsSection title="Profile" description="Your name appears on log posts and readings you enter.">
          <div className="flex flex-col gap-1.5">
            <span className={settingsLabelClass}>Email</span>
            <span className="font-mono text-[13px]">{user.email}</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name" className={settingsLabelClass}>
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSaving}
              placeholder="Full name"
              autoComplete="name"
              className="h-8 text-[13px]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className={settingsLabelClass}>Role</span>
            <span className="text-[13px]">
              <span className="font-mono text-xs uppercase">{user.role}</span>
              <span className="text-muted-foreground"> · {roleNotes[user.role]}</span>
            </span>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" className="h-7 px-2.5 text-xs" disabled={isSaving || !nameChanged}>
              {isSaving ? "Saving…" : "Save profile"}
            </Button>
            {nameChanged && !isSaving && (
              <Button type="button" variant="ghost" size="sm" className="h-7 px-2.5 text-xs" onClick={() => setName(savedName)}>
                Discard
              </Button>
            )}
          </div>
        </SettingsSection>
      </form>

      <form onSubmit={handleChangePassword}>
        {/* Lets password managers associate the new password with this account */}
        <input type="email" autoComplete="username" value={user.email} readOnly hidden />
        <SettingsSection title="Password" description="You’ll need your current password to set a new one.">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="currentPassword" className={settingsLabelClass}>
              Current password
            </Label>
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={isChangingPassword}
              className="h-8 text-[13px]"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="newPassword" className={settingsLabelClass}>
                New password
              </Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isChangingPassword}
                className="h-8 text-[13px]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirmPassword" className={settingsLabelClass}>
                Confirm
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isChangingPassword}
                aria-invalid={confirmPassword.length > 0 && !matches}
                className="h-8 text-[13px]"
              />
            </div>
          </div>
          {newPassword.length > 0 && (
            <ul className="flex flex-col gap-1 font-mono text-[11px]">
              <Requirement met={longEnough}>At least {MIN_PASSWORD_LENGTH} characters</Requirement>
              <Requirement met={matches}>Passwords match</Requirement>
            </ul>
          )}
          <div>
            <Button
              type="submit"
              size="sm"
              className="h-7 px-2.5 text-xs"
              disabled={isChangingPassword || !canChangePassword}
            >
              {isChangingPassword ? "Updating…" : "Update password"}
            </Button>
          </div>
        </SettingsSection>
      </form>

      <SettingsSection title="Session" description="Sign out of Richmond Fire District on this device.">
        <div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-xs text-red-600 hover:text-red-600"
            disabled={isSigningOut}
            onClick={() => startSigningOut(() => logout())}
          >
            <LogOut className="size-3.5" />
            {isSigningOut ? "Signing out…" : "Sign out"}
          </Button>
        </div>
      </SettingsSection>
    </div>
  );
}
