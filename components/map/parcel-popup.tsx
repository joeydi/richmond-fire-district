"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import type { Map } from "mapbox-gl";
import type { Parcel } from "@/lib/types/infrastructure";

interface ParcelPopupProps {
  map: Map | null;
  parcel: Parcel | null;
  lngLat?: [number, number];
  onClose: () => void;
}

export function ParcelPopup({
  map,
  parcel,
  lngLat,
  onClose,
}: ParcelPopupProps) {
  const popupRef = useRef<mapboxgl.Popup | null>(null);

  useEffect(() => {
    if (!map || !parcel || !lngLat) {
      popupRef.current?.remove();
      popupRef.current = null;
      return;
    }

    const html = `
      <div class="min-w-[200px] p-1">
        <div class="font-semibold text-slate-900 mb-2">Parcel Details</div>
        <div class="space-y-1">
          <div class="flex justify-between text-sm">
            <span class="text-slate-500">Parcel ID:</span>
            <span class="text-slate-900 font-mono">${parcel.parcel_id}</span>
          </div>
          ${
            parcel.owner_name
              ? `
          <div class="flex justify-between text-sm">
            <span class="text-slate-500">Owner:</span>
            <span class="text-slate-900">${parcel.owner_name}</span>
          </div>
          `
              : ""
          }
          ${
            parcel.address
              ? `
          <div class="flex justify-between text-sm">
            <span class="text-slate-500">Address:</span>
            <span class="text-slate-900">${parcel.address}</span>
          </div>
          `
              : ""
          }
        </div>
      </div>
    `;

    popupRef.current = new mapboxgl.Popup({
      closeButton: true,
      closeOnClick: false,
      maxWidth: "300px",
    })
      .setLngLat(lngLat)
      .setHTML(html)
      .addTo(map);

    popupRef.current.on("close", onClose);

    return () => {
      popupRef.current?.remove();
      popupRef.current = null;
    };
  }, [map, parcel, lngLat, onClose]);

  return null;
}
