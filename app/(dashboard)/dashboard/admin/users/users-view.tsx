"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { UserActivity } from "@/lib/actions/users";
import type { Profile, UserRole } from "@/lib/types/database";
import { UsersTable } from "./users-table";
import { NewUserSheet, UserSheet } from "./user-sheet";
import { NO_ACTIVITY } from "./user-roles";

/** `?user=new` opens the create form */
const NEW_USER = "new";

interface UsersViewProps {
  users: Profile[];
  activity: Record<string, UserActivity>;
  currentUserId: string;
  now: number;
  initialSelected: string | null;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

function isDialogOpen(): boolean {
  return !!document.querySelector(
    '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [role="menu"], [role="listbox"]'
  );
}

export function UsersView({ users, activity, currentUserId, now, initialSelected }: UsersViewProps) {
  const [selected, setSelected] = useState<string | null>(initialSelected);
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");

  const visible = roleFilter === "all" ? users : users.filter((user) => user.role === roleFilter);
  const selectedUser = users.find((user) => user.id === selected) ?? null;
  const selectedIndex = visible.findIndex((user) => user.id === selected);

  // Everything is already on the client, so selection only touches the URL
  // rather than round-tripping to the server
  const select = useCallback((id: string | null) => {
    setSelected(id);
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("user", id);
    else url.searchParams.delete("user");
    window.history.replaceState(null, "", url.pathname + url.search);
  }, []);

  const selectOffset = useCallback(
    (offset: number) => {
      const next = visible[selectedIndex === -1 ? 0 : selectedIndex + offset];
      if (next) {
        select(next.id);
        document.querySelector(`[data-user-id="${next.id}"]`)?.scrollIntoView({ block: "nearest" });
      }
    },
    [visible, selectedIndex, select]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target) || isDialogOpen()) return;
      if (e.key === "Escape" && selected) {
        select(null);
      } else if (selected === NEW_USER) {
        return;
      } else if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        selectOffset(1);
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        selectOffset(-1);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectOffset, select, selected]);

  const sheet =
    selected === NEW_USER ? (
      <NewUserSheet onClose={() => select(null)} onCreated={(id) => select(id)} />
    ) : selectedUser ? (
      <UserSheet
        key={selectedUser.id}
        user={selectedUser}
        activity={activity[selectedUser.id] ?? NO_ACTIVITY}
        isOwnAccount={selectedUser.id === currentUserId}
        now={now}
        positionLabel={selectedIndex === -1 ? null : `${selectedIndex + 1} / ${visible.length}`}
        onClose={() => select(null)}
        onPrev={selectedIndex > 0 ? () => selectOffset(-1) : undefined}
        onNext={selectedIndex !== -1 && selectedIndex < visible.length - 1 ? () => selectOffset(1) : undefined}
      />
    ) : null;

  return (
    <div data-flush className="flex h-full">
      <div className="min-w-0 flex-1 overflow-y-auto">
        <UsersTable
          users={users}
          visible={visible}
          activity={activity}
          currentUserId={currentUserId}
          now={now}
          roleFilter={roleFilter}
          onRoleFilter={setRoleFilter}
          selectedId={selected}
          onSelect={(user) => select(user.id === selected ? null : user.id)}
          onCreate={() => select(NEW_USER)}
        />
      </div>

      {sheet && (
        <>
          {/* Below lg the sheet overlays the list */}
          <div aria-hidden="true" className="fixed inset-0 z-30 bg-zinc-950/20 lg:hidden" onClick={() => select(null)} />
          <div
            className={cn(
              "fixed inset-y-0 right-0 z-40 w-full max-w-[420px] border-l shadow-lg",
              "lg:static lg:z-auto lg:w-[380px] lg:max-w-none lg:shrink-0 lg:shadow-[-8px_0_24px_-16px_rgb(24_24_27/0.18)]"
            )}
          >
            {sheet}
          </div>
        </>
      )}
    </div>
  );
}
