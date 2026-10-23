"use client";

import { useCallback, useEffect, useState } from "react";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

function isDialogOpen(): boolean {
  return !!document.querySelector(
    '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [role="menu"]'
  );
}

/**
 * Selection for a readings history table's side sheet. The rows are already on
 * the client, so selecting only updates `?reading=` in place rather than
 * round-tripping to the server. ↑/↓ (or j/k) step through rows, Esc closes.
 */
export function useReadingSelection<T extends { id: string }>(rows: T[], initialSelected: string | null) {
  const [selectedId, setSelectedId] = useState(initialSelected);
  const selectedIndex = rows.findIndex((row) => row.id === selectedId);
  const selected = selectedIndex === -1 ? null : rows[selectedIndex];

  const select = useCallback((id: string | null) => {
    setSelectedId(id);
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("reading", id);
    else url.searchParams.delete("reading");
    window.history.replaceState(null, "", url.pathname + url.search);
  }, []);

  const selectOffset = useCallback(
    (offset: number) => {
      const next = rows[selectedIndex === -1 ? 0 : selectedIndex + offset];
      if (next) {
        select(next.id);
        document.querySelector(`[data-reading-id="${next.id}"]`)?.scrollIntoView({ block: "nearest" });
      }
    },
    [rows, selectedIndex, select]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target) || isDialogOpen()) return;
      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        selectOffset(1);
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        selectOffset(-1);
      } else if (e.key === "Escape" && selectedId) {
        select(null);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectOffset, select, selectedId]);

  return {
    selected,
    selectedId: selected?.id ?? null,
    select,
    sheetProps: {
      positionLabel: selectedIndex === -1 ? null : `${selectedIndex + 1} / ${rows.length}`,
      onClose: () => select(null),
      onPrev: selectedIndex > 0 ? () => selectOffset(-1) : undefined,
      onNext: selectedIndex !== -1 && selectedIndex < rows.length - 1 ? () => selectOffset(1) : undefined,
    },
  };
}
