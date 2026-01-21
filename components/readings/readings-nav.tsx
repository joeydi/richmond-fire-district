"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Add Reading", href: "/dashboard/readings" },
  { label: "Meter", href: "/dashboard/readings/meter" },
  { label: "Chlorine", href: "/dashboard/readings/chlorine" },
  { label: "Reservoir", href: "/dashboard/readings/reservoir" },
];

export function ReadingsNav() {
  const pathname = usePathname();

  return (
    <nav className="bg-muted inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]">
      {navItems.map((item) => {
        const isActive =
          item.href === "/dashboard/readings"
            ? pathname === "/dashboard/readings"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex h-[calc(100%-1px)] items-center justify-center rounded-md border border-transparent px-3 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow]",
              isActive
                ? "bg-background text-foreground shadow-sm"
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
