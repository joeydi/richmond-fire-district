import {
  LayoutDashboard,
  Droplets,
  FileText,
  ScrollText,
  Map,
  Building2,
  Users,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  /** Second key of a "g then <key>" shortcut */
  shortcut?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
  adminOnly?: boolean;
}

const navGroups: NavGroup[] = [
  {
    label: "Operate",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, shortcut: "d" },
      { name: "Readings", href: "/dashboard/readings", icon: Droplets, shortcut: "r" },
      { name: "Log", href: "/dashboard/log", icon: ScrollText, shortcut: "l" },
    ],
  },
  {
    label: "Assets",
    items: [
      { name: "Map", href: "/dashboard/map", icon: Map, shortcut: "m" },
      { name: "Infrastructure", href: "/dashboard/infrastructure", icon: Building2, shortcut: "i" },
    ],
  },
  {
    label: "Records",
    items: [
      { name: "Reports", href: "/dashboard/reports", icon: FileText, shortcut: "p" },
      { name: "Contacts", href: "/dashboard/contacts", icon: Users, shortcut: "c" },
    ],
  },
  {
    label: "Admin",
    adminOnly: true,
    items: [
      { name: "Users", href: "/dashboard/admin/users", icon: Settings, shortcut: "u" },
    ],
  },
];

export function getNavGroups(isAdmin: boolean): NavGroup[] {
  return navGroups.filter((group) => !group.adminOnly || isAdmin);
}

export function getNavItems(isAdmin: boolean): NavItem[] {
  return getNavGroups(isAdmin).flatMap((group) => group.items);
}

export function isNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
}
