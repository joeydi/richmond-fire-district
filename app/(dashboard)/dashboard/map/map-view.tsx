"use client";

import { MapContainer } from "@/components/map/map-container";
import type { InfrastructurePoint, Parcel } from "@/lib/types/infrastructure";

interface MapViewProps {
  infrastructurePoints: InfrastructurePoint[];
  parcels: Parcel[];
  isAdmin?: boolean;
}

export function MapView({
  infrastructurePoints,
  parcels,
  isAdmin = false,
}: MapViewProps) {
  return (
    <MapContainer
      className="absolute inset-0"
      infrastructurePoints={infrastructurePoints}
      parcels={parcels}
      isAdmin={isAdmin}
    />
  );
}
