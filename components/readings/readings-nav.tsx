"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Entry", href: "/dashboard/readings" },
  { label: "Meter", href: "/dashboard/readings/meter" },
  { label: "Chlorine", href: "/dashboard/readings/chlorine" },
  { label: "Reservoir", href: "/dashboard/readings/reservoir" },
];

export function ReadingsNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Readings views"
      className="flex w-full gap-0.5 rounded-md bg-muted p-0.5 font-mono text-[11px] sm:w-auto"
    >
      {navItems.map((item) => {
        const isActive =
          item.href === "/dashboard/readings"
            ? pathname === "/dashboard/readings"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex h-8 flex-1 items-center justify-center rounded-sm px-2.5 uppercase transition-colors sm:h-6 sm:flex-none",
              isActive
                ? "bg-background font-medium text-foreground shadow-[0_0_0_1px_var(--border)]"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
