"use client";

import Link from "next/link";
import { User, LogOut, ChevronsUpDown, Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/lib/actions/auth";

export interface UserMenuUser {
  email: string;
  full_name: string | null;
  role?: string | null;
}

interface UserMenuProps {
  user: UserMenuUser | null;
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export function UserMenu({ user }: UserMenuProps) {
  if (!user) return null;

  const initials = getInitials(user.full_name, user.email);
  const displayName = user.full_name || user.email.split("@")[0];

  return (
    <div className="border-t border-sidebar-border pt-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left transition-colors hover:bg-sidebar-accent/60">
            <div className="flex size-[22px] shrink-0 items-center justify-center rounded-sm bg-sidebar-accent font-mono text-[10px] text-foreground">
              {initials}
            </div>
            <span className="min-w-0 flex-1 truncate text-xs text-foreground">
              {displayName}
            </span>
            {user.role && (
              <span className="font-mono text-[10px] text-muted-foreground uppercase">
                {user.role}
              </span>
            )}
            <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="top" className="w-52">
          <div className="px-2 py-1.5 text-xs text-muted-foreground">{user.email}</div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/dashboard/account" className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              Account
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/notifications" className="cursor-pointer">
              <Bell className="mr-2 h-4 w-4" />
              Notifications
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => logout()}
            className="cursor-pointer text-red-600 focus:text-red-600"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
