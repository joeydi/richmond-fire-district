"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
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
  const router = useRouter();

  const handleRefresh = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <MapContainer
      className="absolute inset-0"
      infrastructurePoints={infrastructurePoints}
      isAdmin={isAdmin}
      onRefresh={handleRefresh}
    />
  );
}
