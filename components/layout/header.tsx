"use client";

import { Button } from "@/components/ui/button";
import { Menu, LogOut } from "lucide-react";

interface HeaderProps {
  userEmail?: string;
  onMenuClick?: () => void;
  onLogout?: () => void;
}

export function Header({ userEmail, onMenuClick, onLogout }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-4 lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
      >
        <Menu className="h-6 w-6" />
        <span className="sr-only">Toggle menu</span>
      </Button>

      <div className="flex-1 lg:ml-0" />

      <div className="flex items-center gap-4">
        {userEmail && (
          <span className="hidden text-sm text-slate-600 sm:inline">
            {userEmail}
          </span>
        )}
        <Button variant="ghost" size="icon" onClick={onLogout}>
          <LogOut className="h-5 w-5" />
          <span className="sr-only">Log out</span>
        </Button>
      </div>
    </header>
  );
}
