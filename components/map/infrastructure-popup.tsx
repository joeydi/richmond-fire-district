"use client";

import { useEffect, useRef, useCallback } from "react";
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
  onEdit?: (point: InfrastructurePoint) => void;
  onDelete?: (point: InfrastructurePoint) => void;
}

export function InfrastructurePopup({
  map,
  point,
  isAdmin = false,
  onClose,
  onEdit,
  onDelete,
}: InfrastructurePopupProps) {
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const pointRef = useRef<InfrastructurePoint | null>(null);

  // Keep track of current point for event handlers
  pointRef.current = point;

  // Handle edit button click
  const handleEdit = useCallback(() => {
    if (pointRef.current && onEdit) {
      onEdit(pointRef.current);
    }
  }, [onEdit]);

  // Handle delete button click
  const handleDelete = useCallback(() => {
    if (pointRef.current && onDelete) {
      onDelete(pointRef.current);
    }
  }, [onDelete]);

  useEffect(() => {
    // Attach event listeners to window for popup button clicks
    const handlePopupEdit = () => handleEdit();
    const handlePopupDelete = () => handleDelete();

    window.addEventListener("infrastructure-popup-edit", handlePopupEdit);
    window.addEventListener("infrastructure-popup-delete", handlePopupDelete);

    return () => {
      window.removeEventListener("infrastructure-popup-edit", handlePopupEdit);
      window.removeEventListener("infrastructure-popup-delete", handlePopupDelete);
    };
  }, [handleEdit, handleDelete]);

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

    // Admin action buttons
    const adminButtons = isAdmin
      ? `
        <div class="mt-3 pt-3 border-t border-slate-200 flex gap-2">
          <button
            onclick="window.dispatchEvent(new CustomEvent('infrastructure-popup-edit'))"
            class="flex-1 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
          >
            Edit
          </button>
          <button
            onclick="window.dispatchEvent(new CustomEvent('infrastructure-popup-delete'))"
            class="flex-1 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded transition-colors"
          >
            Delete
          </button>
        </div>
      `
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
          ${point.notes ? `
          <div class="text-sm mt-2">
            <span class="text-slate-500">Notes:</span>
            <p class="text-slate-700 mt-0.5">${point.notes}</p>
          </div>
          ` : ""}
          ${propertiesHtml}
        </div>
        ${adminButtons}
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
