"use client";

import { MapContainer } from "@/components/map/map-container";
import type { InfrastructurePoint } from "@/lib/types/infrastructure";

interface MapViewProps {
  infrastructurePoints: InfrastructurePoint[];
  isAdmin?: boolean;
}

export function MapView({
  infrastructurePoints,
  isAdmin = false,
}: MapViewProps) {
  return (
    <MapContainer
      className="absolute inset-0"
      infrastructurePoints={infrastructurePoints}
      isAdmin={isAdmin}
    />
  );
}
