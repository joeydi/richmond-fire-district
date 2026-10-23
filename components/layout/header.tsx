"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { getNavItems } from "./nav-config";

const TITLE_MAP: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/readings": "Readings",
  "/dashboard/readings/meter": "Meter Reading",
  "/dashboard/readings/chlorine": "Chlorine Levels",
  "/dashboard/readings/reservoir": "Reservoir Levels",
  "/dashboard/readings/import": "Import Readings",
  "/dashboard/contacts": "Contacts",
  "/dashboard/contacts/new": "Add New Contact",
  "/dashboard/log": "Log",
  "/dashboard/log/new": "New Post",
  "/dashboard/reports": "Reports",
  "/dashboard/map": "System Map",
  "/dashboard/infrastructure": "Infrastructure",
  "/dashboard/infrastructure/report": "Infrastructure Report",
  "/dashboard/admin/users": "Users",
  "/dashboard/account": "Account Settings",
  "/dashboard/notifications": "Notifications",
};

function getPageTitle(pathname: string): string {
  if (TITLE_MAP[pathname]) {
    return TITLE_MAP[pathname];
  }
  if (/^\/dashboard\/contacts\/[^/]+\/edit$/.test(pathname)) {
    return "Edit Contact";
  }
  if (/^\/dashboard\/log\/[^/]+\/edit$/.test(pathname)) {
    return "Edit Post";
  }
  if (/^\/dashboard\/log\/[^/]+$/.test(pathname)) {
    return "View Post";
  }
  if (/^\/dashboard\/admin\/users\/[^/]+\/edit$/.test(pathname)) {
    return "Edit User";
  }
  return "";
}

interface Crumb {
  label: string;
  href?: string;
}

function getBreadcrumbs(pathname: string): Crumb[] {
  const title = getPageTitle(pathname);
  const parent = getNavItems(true).find(
    (item) =>
      item.href !== "/dashboard" &&
      item.href !== pathname &&
      pathname.startsWith(item.href + "/")
  );

  const crumbs: Crumb[] = [];
  if (parent) crumbs.push({ label: parent.name, href: parent.href });
  if (title) crumbs.push({ label: title });
  return crumbs;
}

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const crumbs = getBreadcrumbs(pathname);

  return (
    <header className="flex h-11 shrink-0 items-center gap-2 border-b bg-background px-2 lg:px-4">
      <Button
        variant="ghost"
        size="icon"
        className="size-9 lg:hidden"
        onClick={onMenuClick}
      >
        <Menu className="size-[18px]" />
        <span className="sr-only">Toggle menu</span>
      </Button>
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-xs">
        <span className="hidden text-muted-foreground sm:inline">Water System</span>
        {crumbs.map((crumb, i) => (
          <Fragment key={crumb.label}>
            <span
              aria-hidden="true"
              className={i === 0 ? "hidden text-zinc-400 sm:inline" : "text-zinc-400"}
            >
              /
            </span>
            {crumb.href ? (
              <Link
                href={crumb.href}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {crumb.label}
              </Link>
            ) : (
              <h1 className="truncate text-[13px] font-semibold text-foreground">
                {crumb.label}
              </h1>
            )}
          </Fragment>
        ))}
      </nav>
    </header>
  );
}
