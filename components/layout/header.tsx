"use client";

import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

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
  "/dashboard/infrastructure": "Infrastructure Points",
  "/dashboard/admin/users": "User Management",
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

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <header className="flex h-16 items-center border-b bg-white px-4 lg:px-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle menu</span>
        </Button>
        {title && (
          <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        )}
      </div>
    </header>
  );
}
