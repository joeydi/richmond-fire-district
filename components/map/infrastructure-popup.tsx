"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import type { Map } from "mapbox-gl";
import type { InfrastructurePoint } from "@/lib/types/infrastructure";
import {
  INFRASTRUCTURE_LABELS,
  INFRASTRUCTURE_COLORS,
} from "@/lib/types/infrastructure";

interface InfrastructurePopupProps {
  map: Map | null;
  point: InfrastructurePoint | null;
  isAdmin?: boolean;
  onClose: () => void;
}

export function InfrastructurePopup({
  map,
  point,
  isAdmin = false,
  onClose,
}: InfrastructurePopupProps) {
  const popupRef = useRef<mapboxgl.Popup | null>(null);

  useEffect(() => {
    if (!map || !point) {
      popupRef.current?.remove();
      popupRef.current = null;
      return;
    }

    const statusColors: Record<string, string> = {
      active: "bg-green-100 text-green-800",
      inactive: "bg-gray-100 text-gray-800",
      maintenance: "bg-yellow-100 text-yellow-800",
    };

    const statusLabels: Record<string, string> = {
      active: "Active",
      inactive: "Inactive",
      maintenance: "Maintenance",
    };

    // Build properties HTML
    const propertiesHtml = Object.entries(point.properties || {})
      .filter(([key]) => !["id", "type", "name", "status"].includes(key))
      .map(
        ([key, value]) => `
        <div class="flex justify-between text-sm">
          <span class="text-slate-500 capitalize">${key.replace(/_/g, " ")}:</span>
          <span class="text-slate-900">${value}</span>
        </div>
      `
      )
      .join("");

    const editLink = isAdmin
      ? `<a href="/dashboard/admin/infrastructure/${point.id}/edit" class="mt-3 block text-center text-sm text-blue-600 hover:text-blue-800">Edit</a>`
      : "";

    const html = `
      <div class="min-w-[200px] p-1">
        <div class="flex items-center gap-2 mb-2">
          <div class="w-3 h-3 rounded-full" style="background-color: ${INFRASTRUCTURE_COLORS[point.type]}"></div>
          <span class="font-semibold text-slate-900">${point.name}</span>
        </div>
        <div class="space-y-1 mb-2">
          <div class="flex justify-between text-sm">
            <span class="text-slate-500">Type:</span>
            <span class="text-slate-900">${INFRASTRUCTURE_LABELS[point.type]}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-slate-500">Status:</span>
            <span class="px-2 py-0.5 rounded-full text-xs ${statusColors[point.status] || statusColors.active}">${statusLabels[point.status] || point.status}</span>
          </div>
          ${propertiesHtml}
        </div>
        ${editLink}
      </div>
    `;

    popupRef.current = new mapboxgl.Popup({
      closeButton: true,
      closeOnClick: false,
      maxWidth: "300px",
    })
      .setLngLat([point.longitude, point.latitude])
      .setHTML(html)
      .addTo(map);

    popupRef.current.on("close", onClose);

    return () => {
      popupRef.current?.remove();
      popupRef.current = null;
    };
  }, [map, point, isAdmin, onClose]);

  return null;
}
