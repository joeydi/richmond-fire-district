"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Plus, Search, type LucideIcon } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getNavItems } from "./nav-config";

interface JumpTarget {
  name: string;
  href: string;
  icon: LucideIcon;
  hint?: string;
}

const ACTIONS: JumpTarget[] = [
  { name: "New reading", href: "/dashboard/readings", icon: Plus },
  { name: "New log post", href: "/dashboard/log/new", icon: Plus },
  { name: "New contact", href: "/dashboard/contacts/new", icon: Plus },
  { name: "Infrastructure report", href: "/dashboard/infrastructure/report", icon: Plus },
];

interface JumpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
}

export function JumpDialog({ open, onOpenChange, isAdmin }: JumpDialogProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const targets = useMemo<JumpTarget[]>(
    () => [
      ...getNavItems(isAdmin).map((item) => ({
        name: item.name,
        href: item.href,
        icon: item.icon,
        hint: item.shortcut ? `G ${item.shortcut.toUpperCase()}` : undefined,
      })),
      ...ACTIONS,
    ],
    [isAdmin]
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? targets.filter((t) => t.name.toLowerCase().includes(q)) : targets;
  }, [targets, query]);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setQuery("");
      setActiveIndex(0);
    }
    onOpenChange(next);
  }

  function go(target: JumpTarget) {
    handleOpenChange(false);
    router.push(target.href);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[activeIndex]) {
      e.preventDefault();
      go(results[activeIndex]);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-[20%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-md"
      >
        <DialogTitle className="sr-only">Jump to</DialogTitle>
        <div className="flex h-11 items-center gap-2 border-b px-3">
          <Search className="size-4 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Jump to a page or action…"
            aria-label="Jump to a page or action"
            className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd>ESC</kbd>
        </div>
        <ul role="listbox" aria-label="Results" className="max-h-80 overflow-y-auto p-1">
          {results.length === 0 && (
            <li className="px-2 py-6 text-center text-xs text-muted-foreground">No matches</li>
          )}
          {results.map((target, i) => (
            <li key={target.name} role="option" aria-selected={i === activeIndex}>
              <button
                type="button"
                onClick={() => go(target)}
                onMouseMove={() => setActiveIndex(i)}
                className={cn(
                  "flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[13px]",
                  i === activeIndex && "bg-accent"
                )}
              >
                <target.icon className="size-[15px] text-muted-foreground" strokeWidth={1.75} />
                <span className="flex-1">{target.name}</span>
                {target.hint && (
                  <span className="font-mono text-[10px] text-muted-foreground">{target.hint}</span>
                )}
                {i === activeIndex && (
                  <CornerDownLeft className="size-3.5 text-muted-foreground" />
                )}
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
