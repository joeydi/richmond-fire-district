"use client";

import { useCallback, useState } from "react";
import { Toaster } from "sonner";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { JumpDialog } from "@/components/layout/jump-dialog";
import type { UserMenuUser } from "@/components/layout/user-menu";
import { useNavShortcuts } from "@/hooks/use-nav-shortcuts";

interface DashboardShellProps {
  children: React.ReactNode;
  isAdmin: boolean;
  user?: UserMenuUser | null;
}

export function DashboardShell({ children, isAdmin, user }: DashboardShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [jumpOpen, setJumpOpen] = useState(false);

  const openJump = useCallback(() => {
    setMobileNavOpen(false);
    setJumpOpen(true);
  }, []);
  useNavShortcuts(isAdmin, openJump);

  return (
    <div className="flex h-screen bg-background">
      <Toaster position="top-right" richColors />
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <Sidebar isAdmin={isAdmin} user={user} onJump={openJump} />
      </div>

      {/* Mobile navigation */}
      <MobileNav
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        onJump={openJump}
        isAdmin={isAdmin}
        user={user}
      />

      <JumpDialog open={jumpOpen} onOpenChange={setJumpOpen} isAdmin={isAdmin} />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setMobileNavOpen(true)} />
        {/* Pages that manage their own full-bleed layout opt out of padding with data-flush.
            relative keeps absolutely positioned descendants (e.g. sr-only labels) inside
            this scroll container instead of stretching the document. */}
        <main className="relative flex-1 overflow-auto p-4 has-[[data-flush]]:p-0 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
