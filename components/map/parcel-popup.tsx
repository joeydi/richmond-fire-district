"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import mapboxgl from "mapbox-gl";
import type { Map } from "mapbox-gl";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { pointInGeometry } from "@/lib/geo";
import {
  INFRASTRUCTURE_COLORS,
  type InfrastructurePoint,
  type Parcel,
} from "@/lib/types/infrastructure";

interface ParcelPopupProps {
  map: Map | null;
  parcel: Parcel | null;
  lngLat?: [number, number];
  /** Searched for points that sit on the parcel */
  points: InfrastructurePoint[];
  onPointSelect?: (point: InfrastructurePoint) => void;
  onClose: () => void;
}

function Label({ children }: { children: React.ReactNode }) {
  return <dt className="font-mono text-[10px] tracking-[0.06em] text-muted-foreground uppercase">{children}</dt>;
}

/** "66 ROBBINS MTN EXT" → "66 ROBBINS": loose enough to match "66 Robbins Mtn. Ext." in contacts */
function contactSearchTerm(address: string): string | null {
  const match = address.match(/^(\d+[A-Za-z]?)\s+([A-Za-z]+)/);
  return match ? `${match[1]} ${match[2]}` : null;
}

export function ParcelPopup({ map, parcel, lngLat, points, onPointSelect, onClose }: ParcelPopupProps) {
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  // The popup's DOM node; React renders the card into it through a portal
  const [container] = useState(() => document.createElement("div"));
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!map || !parcel || !lngLat) {
      popupRef.current?.remove();
      popupRef.current = null;
      return;
    }

    popupRef.current = new mapboxgl.Popup({
      closeButton: true,
      closeOnClick: false,
      maxWidth: "280px",
      offset: 6,
      className: "console-popup",
    })
      .setLngLat(lngLat)
      .setDOMContent(container)
      .addTo(map);

    popupRef.current.on("close", () => onCloseRef.current());

    return () => {
      popupRef.current?.remove();
      popupRef.current = null;
    };
  }, [map, parcel, lngLat, container]);

  const pointsOnParcel = useMemo(
    () => (parcel ? points.filter((p) => pointInGeometry(p.longitude, p.latitude, parcel.geometry)) : []),
    [parcel, points]
  );

  if (!parcel) return null;

  const owners = parcel.owner_name?.split(/\s*,\s*/).filter(Boolean) ?? [];
  const searchTerm = parcel.address ? contactSearchTerm(parcel.address) : null;

  return createPortal(
    <div className="flex w-[248px] flex-col text-xs">
      <div className="flex flex-col gap-1 px-3 pt-2.5 pb-2 pr-8">
        <span className="font-mono text-[10px] tracking-[0.06em] text-muted-foreground uppercase">Parcel</span>
        <span className="text-[13px] leading-snug font-semibold">{parcel.address ?? "No address"}</span>
      </div>

      <dl className="flex flex-col gap-2 border-t px-3 py-2.5">
        <div className="flex flex-col gap-0.5">
          <Label>Parcel ID</Label>
          <dd className="flex items-center gap-1.5">
            <span className="font-mono">{parcel.parcel_id}</span>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground"
              title="Copy parcel ID"
              onClick={() => {
                navigator.clipboard.writeText(parcel.parcel_id);
                toast.success("Parcel ID copied");
              }}
            >
              <Copy className="size-3" />
              <span className="sr-only">Copy parcel ID</span>
            </button>
          </dd>
        </div>
        {owners.length > 0 && (
          <div className="flex flex-col gap-0.5">
            <Label>{owners.length === 1 ? "Owner" : "Owners"}</Label>
            {owners.map((owner) => (
              <dd key={owner} className="text-zinc-800">
                {owner}
              </dd>
            ))}
          </div>
        )}
      </dl>

      {pointsOnParcel.length > 0 && (
        <div className="flex flex-col border-t py-1.5">
          <span className="px-3 pb-0.5 font-mono text-[10px] tracking-[0.06em] text-muted-foreground uppercase">
            On this parcel · {pointsOnParcel.length}
          </span>
          {pointsOnParcel.map((point) => (
            <button
              key={point.id}
              type="button"
              onClick={() => onPointSelect?.(point)}
              className="flex h-6 items-center gap-2 px-3 text-left hover:bg-zinc-50"
            >
              <span
                aria-hidden="true"
                className="size-[7px] shrink-0 rounded-[2px]"
                style={{ backgroundColor: INFRASTRUCTURE_COLORS[point.type] }}
              />
              <span className="truncate">{point.name}</span>
            </button>
          ))}
        </div>
      )}

      {searchTerm && (
        <div className="border-t px-3 py-2">
          <Link
            href={`/dashboard/contacts?search=${encodeURIComponent(searchTerm)}`}
            className="font-mono text-[10px] tracking-[0.04em] text-cyan-800 hover:underline"
          >
            FIND CONTACTS AT {searchTerm.toUpperCase()} →
          </Link>
        </div>
      )}
    </div>,
    container
  );
}
