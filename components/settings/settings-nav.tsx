"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Account", href: "/dashboard/account" },
  { label: "Notifications", href: "/dashboard/notifications" },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-2 border-b px-4 py-2">
      <nav
        aria-label="Settings"
        className="flex w-full gap-0.5 rounded-md bg-muted p-0.5 font-mono text-[11px] sm:w-auto"
      >
        {navItems.map((item) => {
          const isActive = pathname === item.href;
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
    </div>
  );
}

/** A settings group: label and help on the left, fields on the right from md up */
export function SettingsSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-label={title}
      className={cn("grid gap-3 border-b px-4 py-4 md:grid-cols-[220px_minmax(0,440px)] md:gap-8 lg:px-6", className)}
    >
      <div className="flex flex-col gap-1">
        <h2 className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">{title}</h2>
        {description && <p className="text-xs leading-relaxed text-zinc-600">{description}</p>}
      </div>
      <div className="flex min-w-0 flex-col gap-3">{children}</div>
    </section>
  );
}

export const settingsLabelClass = "font-mono text-[10px] font-normal tracking-[0.08em] text-muted-foreground uppercase";
