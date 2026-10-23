"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { InfrastructureTable } from "@/components/infrastructure/infrastructure-table";
import { NewPointSheet, PointSheet } from "@/components/infrastructure/point-sheet";
import { DeleteDialog } from "@/components/infrastructure/delete-dialog";
import type { InfrastructurePoint } from "@/lib/types/infrastructure";
import type { InfrastructurePointDetails } from "@/lib/actions/infrastructure";

interface InfrastructureViewProps {
  points: InfrastructurePoint[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  search: string;
  typeFilter: string;
  statusFilter: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
  isAdmin: boolean;
  details: InfrastructurePointDetails | null;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

function isDialogOpen(): boolean {
  return !!document.querySelector(
    '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [role="menu"]'
  );
}

export function InfrastructureView({
  points,
  totalCount,
  currentPage,
  pageSize,
  search,
  typeFilter,
  statusFilter,
  sortBy,
  sortOrder,
  isAdmin,
  details,
}: InfrastructureViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Highlights the clicked row right away while the details load
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pointToDelete, setPointToDelete] = useState<InfrastructurePoint | null>(null);
  // Editing and creating happen in the sheet, in place of the details
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const selectedId = isPending && pendingId !== null ? pendingId : (details?.point.id ?? null);
  const selectedIndex = points.findIndex((p) => p.id === selectedId);
  const sheetOpen = isCreating || (details !== null && (selectedId === details.point.id || isPending));
  const editing = !isCreating && details !== null && editingId === details.point.id;

  const navigate = useCallback(
    (params: Record<string, string | number>, mode: "push" | "replace") => {
      const url = new URL(window.location.href);
      Object.entries(params).forEach(([key, value]) => {
        if (value) {
          url.searchParams.set(key, String(value));
        } else {
          url.searchParams.delete(key);
        }
      });
      startTransition(() => {
        router[mode](url.pathname + url.search, { scroll: false });
      });
    },
    [router]
  );

  const updateUrl = useCallback(
    (params: Record<string, string | number>) => navigate(params, "push"),
    [navigate]
  );

  // Selection replaces history so stepping through points doesn't flood back
  const select = useCallback(
    (id: string | null) => {
      setPendingId(id);
      setEditingId(null);
      setIsCreating(false);
      navigate({ point: id ?? "" }, "replace");
    },
    [navigate]
  );

  const editPoint = useCallback(
    (point: InfrastructurePoint) => {
      if (point.id !== details?.point.id) select(point.id);
      setEditingId(point.id);
    },
    [details, select]
  );

  const selectOffset = useCallback(
    (offset: number) => {
      const next = points[selectedIndex === -1 ? 0 : selectedIndex + offset];
      if (next) {
        select(next.id);
        document
          .querySelector(`[data-point-id="${next.id}"]`)
          ?.scrollIntoView({ block: "nearest" });
      }
    },
    [points, selectedIndex, select]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target) || isDialogOpen()) return;
      if (isCreating || editing) {
        // Only Esc while a form is open, so stray keys can't navigate away from unsaved changes
        if (e.key === "Escape") {
          setIsCreating(false);
          setEditingId(null);
        }
        return;
      }
      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        selectOffset(1);
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        selectOffset(-1);
      } else if (e.key === "Escape" && selectedId) {
        select(null);
      } else if (e.key === "e" && isAdmin && details) {
        e.preventDefault();
        setEditingId(details.point.id);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectOffset, select, selectedId, isAdmin, details, isCreating, editing]);

  return (
    <div data-flush className="flex h-full">
      <div className="min-w-0 flex-1 overflow-y-auto">
        <InfrastructureTable
          points={points}
          totalCount={totalCount}
          currentPage={currentPage}
          pageSize={pageSize}
          search={search}
          typeFilter={typeFilter}
          statusFilter={statusFilter}
          sortBy={sortBy}
          sortOrder={sortOrder}
          isAdmin={isAdmin}
          isPending={isPending}
          selectedId={selectedId}
          updateUrl={updateUrl}
          onSelect={(point) => select(point.id === selectedId ? null : point.id)}
          onEdit={editPoint}
          onCreate={() => {
            setEditingId(null);
            setIsCreating(true);
          }}
        />
      </div>

      {sheetOpen && (
        <>
          {/* Below lg the sheet overlays the table */}
          <div
            aria-hidden="true"
            className="fixed inset-0 z-30 bg-zinc-950/20 lg:hidden"
            onClick={() => (isCreating ? setIsCreating(false) : select(null))}
          />
          <div
            className={cn(
              "fixed inset-y-0 right-0 z-40 w-full max-w-[420px] border-l shadow-lg transition-opacity",
              "lg:static lg:z-auto lg:w-[400px] lg:max-w-none lg:shrink-0 lg:shadow-[-8px_0_24px_-16px_rgb(24_24_27/0.18)]",
              isPending && !isCreating && "opacity-60"
            )}
          >
            {isCreating ? (
              <NewPointSheet
                onClose={() => setIsCreating(false)}
                onSaved={(point) => select(point.id)}
              />
            ) : details && (
            <PointSheet
              details={details}
              isAdmin={isAdmin}
              positionLabel={
                selectedIndex === -1
                  ? null
                  : `${(currentPage - 1) * pageSize + selectedIndex + 1} / ${totalCount}`
              }
              onClose={() => select(null)}
              onPrev={selectedIndex > 0 ? () => selectOffset(-1) : undefined}
              onNext={
                selectedIndex !== -1 && selectedIndex < points.length - 1
                  ? () => selectOffset(1)
                  : undefined
              }
              onSelect={select}
              onEdit={() => setEditingId(details.point.id)}
              onDelete={() => setPointToDelete(details.point)}
              editing={editing}
              onCancelEdit={() => setEditingId(null)}
              onSaved={() => {
                setEditingId(null);
                router.refresh();
              }}
            />
            )}
          </div>
        </>
      )}

      <DeleteDialog
        point={pointToDelete}
        open={!!pointToDelete}
        onOpenChange={(open) => {
          if (!open) setPointToDelete(null);
        }}
      />
    </div>
  );
}
