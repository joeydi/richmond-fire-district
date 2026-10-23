"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Droplet } from "lucide-react";
import { cn } from "@/lib/utils";
import { getNavGroups, isNavItemActive } from "./nav-config";
import { UserMenu, type UserMenuUser } from "./user-menu";

interface SidebarProps {
  isAdmin?: boolean;
  user?: UserMenuUser | null;
  onJump?: () => void;
  onNavigate?: () => void;
  className?: string;
}

export function Sidebar({ isAdmin = false, user, onJump, onNavigate, className }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div
      className={cn(
        "flex h-full w-52 flex-col gap-3 border-r border-sidebar-border bg-sidebar px-2 py-2.5 text-[13px] text-sidebar-foreground",
        className
      )}
    >
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className="flex h-7 items-center gap-2 px-1.5 text-foreground"
      >
        <Droplet className="size-4 text-brand" strokeWidth={2.25} />
        <span className="font-mono text-xs font-medium tracking-wide">RFD / WATER</span>
      </Link>

      {onJump && (
        <button
          type="button"
          onClick={onJump}
          className="flex h-7 items-center gap-2 rounded-md border bg-background px-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <span className="flex-1 text-left">Jump to…</span>
          <kbd>⌘K</kbd>
        </button>
      )}

      {getNavGroups(isAdmin).map((group) => (
        <nav key={group.label} aria-label={group.label} className="flex flex-col gap-px">
          <span className="px-2 pb-1 font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
            {group.label}
          </span>
          {group.items.map((item) => {
            const isActive = isNavItemActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group flex h-7 items-center gap-2 rounded-md px-2 transition-colors",
                  isActive
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon
                  className={cn(
                    "size-[15px]",
                    isActive ? "text-sidebar-primary" : "text-muted-foreground"
                  )}
                  strokeWidth={1.75}
                />
                <span className="flex-1">{item.name}</span>
                {item.shortcut && (
                  <span className="hidden font-mono text-[10px] text-muted-foreground uppercase lg:inline">
                    G {item.shortcut}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      ))}

      <div className="flex-1" />
      <UserMenu user={user ?? null} />
    </div>
  );
}
