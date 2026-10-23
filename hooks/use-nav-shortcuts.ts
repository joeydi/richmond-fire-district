"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getNavItems } from "@/components/layout/nav-config";

const SEQUENCE_TIMEOUT_MS = 1000;

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
  );
}

/**
 * Global keyboard navigation: ⌘K / Ctrl+K opens the jump dialog,
 * and "g" followed by a letter goes to that nav item (g d → Dashboard).
 */
export function useNavShortcuts(isAdmin: boolean, onJump: () => void) {
  const router = useRouter();

  useEffect(() => {
    const items = getNavItems(isAdmin);
    let pendingSince = 0;

    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onJump();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;

      const key = e.key.toLowerCase();
      if (pendingSince && Date.now() - pendingSince < SEQUENCE_TIMEOUT_MS) {
        pendingSince = 0;
        const item = items.find((i) => i.shortcut === key);
        if (item) {
          e.preventDefault();
          router.push(item.href);
        }
        return;
      }
      pendingSince = key === "g" ? Date.now() : 0;
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isAdmin, onJump, router]);
}
