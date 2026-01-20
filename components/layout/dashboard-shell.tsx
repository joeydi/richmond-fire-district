"use client";

import { useState } from "react";
import { Toaster } from "sonner";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { logout } from "@/lib/actions/auth";

interface DashboardShellProps {
  children: React.ReactNode;
  isAdmin: boolean;
}

export function DashboardShell({ children, isAdmin }: DashboardShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50">
      <Toaster position="top-right" richColors />
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <Sidebar isAdmin={isAdmin} />
      </div>

      {/* Mobile navigation */}
      <MobileNav
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        isAdmin={isAdmin}
      />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          onMenuClick={() => setMobileNavOpen(true)}
          onLogout={logout}
        />
        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
