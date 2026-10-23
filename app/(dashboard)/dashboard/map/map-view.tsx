"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { MapContainer } from "@/components/map/map-container";
import { NewPointSheet, PointSheet, type MapFormContext } from "@/components/infrastructure/point-sheet";
import { DeleteDialog } from "@/components/infrastructure/delete-dialog";
import type { LatLng } from "@/components/infrastructure/point-form";
import type { InfrastructurePoint } from "@/lib/types/infrastructure";
import type { InfrastructurePointDetails } from "@/lib/actions/infrastructure";

interface MapViewProps {
  infrastructurePoints: InfrastructurePoint[];
  isAdmin?: boolean;
  /** Details for `?point=`, shown in the side sheet */
  details: InfrastructurePointDetails | null;
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

export function MapView({ infrastructurePoints, isAdmin = false, details }: MapViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Rings the clicked point right away while its details load
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  /** Where a new point was placed; null when not adding one */
  const [creatingAt, setCreatingAt] = useState<LatLng | null>(null);
  /** Last map click while a form is open, applied to the form's coordinates */
  const [picked, setPicked] = useState<LatLng | null>(null);
  /** The open form's coordinates, shown as a marker */
  const [draft, setDraft] = useState<LatLng | null>(null);
  const [focus, setFocus] = useState<(LatLng & { key: string }) | null>(() =>
    details ? { lat: details.point.latitude, lng: details.point.longitude, key: details.point.id } : null
  );
  const [pointToDelete, setPointToDelete] = useState<InfrastructurePoint | null>(null);

  const selectedId = isPending && pendingId !== null ? pendingId : (details?.point.id ?? null);
  const editing = !creatingAt && details !== null && editingId === details.point.id;
  const formOpen = !!creatingAt || editing;
  const sheetOpen = !!creatingAt || (details !== null && (selectedId === details.point.id || isPending));

  const closeForms = useCallback(() => {
    setCreatingAt(null);
    setEditingId(null);
    setPicked(null);
    setDraft(null);
  }, []);

  // Selection replaces history so clicking around the map doesn't flood back
  const select = useCallback(
    (id: string | null, options: { fly?: boolean } = {}) => {
      setPendingId(id);
      closeForms();
      if (id && options.fly) {
        const point = infrastructurePoints.find((p) => p.id === id);
        if (point) setFocus({ lat: point.latitude, lng: point.longitude, key: `${id}:${Date.now()}` });
      }
      const url = new URL(window.location.href);
      if (id) url.searchParams.set("point", id);
      else url.searchParams.delete("point");
      startTransition(() => {
        router.replace(url.pathname + url.search, { scroll: false });
      });
    },
    [router, infrastructurePoints, closeForms]
  );

  const handleAddPoint = useCallback((location: LatLng) => {
    setEditingId(null);
    setPicked(null);
    setDraft(location);
    setCreatingAt(location);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target) || isDialogOpen()) return;
      if (e.key === "Escape") {
        if (formOpen) closeForms();
        else if (selectedId) select(null);
      } else if (e.key === "e" && isAdmin && details && !formOpen) {
        e.preventDefault();
        setEditingId(details.point.id);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [formOpen, closeForms, selectedId, select, isAdmin, details]);

  const mapContext: MapFormContext = useMemo(
    () => ({ pickedLocation: picked, onLocationChange: setDraft }),
    [picked]
  );

  return (
    <div data-flush className="flex h-full">
      <div className="relative min-w-0 flex-1">
        <MapContainer
          className="absolute inset-0"
          infrastructurePoints={infrastructurePoints}
          isAdmin={isAdmin}
          selectedId={formOpen && !editing ? null : selectedId}
          onPointSelect={(point) => select(point.id)}
          onAddPoint={handleAddPoint}
          onPickLocation={formOpen ? setPicked : null}
          draftLocation={formOpen ? draft : null}
          focus={focus}
        />
      </div>

      {sheetOpen && (
        <>
          {/* Below lg the sheet overlays the map */}
          <div
            aria-hidden="true"
            className="fixed inset-0 z-30 bg-zinc-950/20 lg:hidden"
            onClick={() => (creatingAt ? closeForms() : select(null))}
          />
          <div
            className={cn(
              "fixed inset-y-0 right-0 z-40 w-full max-w-[420px] border-l shadow-lg transition-opacity",
              "lg:static lg:z-auto lg:w-[400px] lg:max-w-none lg:shrink-0 lg:shadow-[-8px_0_24px_-16px_rgb(24_24_27/0.18)]",
              isPending && !creatingAt && "opacity-60"
            )}
          >
            {creatingAt ? (
              <NewPointSheet
                key={`${creatingAt.lat},${creatingAt.lng}`}
                initialLocation={creatingAt}
                mapContext={mapContext}
                onClose={closeForms}
                onSaved={(point) => select(point.id)}
              />
            ) : (
              details && (
                <PointSheet
                  details={details}
                  isAdmin={isAdmin}
                  positionLabel={null}
                  onClose={() => select(null)}
                  onSelect={(id) => select(id, { fly: true })}
                  onEdit={() => setEditingId(details.point.id)}
                  onDelete={() => setPointToDelete(details.point)}
                  editing={editing}
                  onCancelEdit={closeForms}
                  onSaved={() => {
                    closeForms();
                    router.refresh();
                  }}
                  mapContext={mapContext}
                />
              )
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
