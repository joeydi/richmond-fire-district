"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "./sidebar";
import type { UserMenuUser } from "./user-menu";

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  onJump?: () => void;
  isAdmin?: boolean;
  user?: UserMenuUser | null;
}

export function MobileNav({ isOpen, onClose, onJump, isAdmin = false, user }: MobileNavProps) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-zinc-950/30"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 shadow-lg">
        <div className="relative h-full">
          <Sidebar
            isAdmin={isAdmin}
            user={user}
            onJump={onJump}
            onNavigate={onClose}
            className="w-full"
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1.5 top-1.5 size-8 text-muted-foreground hover:bg-sidebar-accent"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close menu</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
