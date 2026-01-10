"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { InfrastructurePoint, Parcel, InfrastructureType } from "@/lib/types/infrastructure";
import { InfrastructureLayer } from "./infrastructure-layer";
import { ParcelsLayer } from "./parcels-layer";
import { InfrastructurePopup } from "./infrastructure-popup";
import { ParcelPopup } from "./parcel-popup";
import { LayerControls, type LayerVisibility } from "./layer-controls";
import { Legend } from "./legend";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

// Richmond, VT area coordinates
const DEFAULT_CENTER: [number, number] = [-72.9, 44.4];
const DEFAULT_ZOOM = 13;

const defaultLayerVisibility: LayerVisibility = {
  infrastructure: true,
  parcels: true,
  infrastructureTypes: {
    shutoff_valve: true,
    hydrant: true,
    well: true,
    meter: true,
    reservoir: true,
  },
};

interface MapContainerProps {
  className?: string;
  infrastructurePoints?: InfrastructurePoint[];
  parcels?: Parcel[];
  isAdmin?: boolean;
}

export function MapContainer({
  className,
  infrastructurePoints = [],
  parcels = [],
  isAdmin = false,
}: MapContainerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null);

  // Layer visibility state
  const [layerVisibility, setLayerVisibility] =
    useState<LayerVisibility>(defaultLayerVisibility);

  // Popup state
  const [selectedInfrastructure, setSelectedInfrastructure] =
    useState<InfrastructurePoint | null>(null);
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [parcelClickLngLat, setParcelClickLngLat] = useState<
    [number, number] | undefined
  >(undefined);

  // Filter infrastructure points by visible types
  const visibleInfrastructurePoints = useMemo(() => {
    if (!layerVisibility.infrastructure) return [];
    return infrastructurePoints.filter(
      (point) => layerVisibility.infrastructureTypes[point.type as InfrastructureType]
    );
  }, [infrastructurePoints, layerVisibility.infrastructure, layerVisibility.infrastructureTypes]);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.current.addControl(new mapboxgl.ScaleControl(), "bottom-left");

    map.current.on("load", () => {
      setMapLoaded(true);
      setMapInstance(map.current);
    });

    // Track click position for parcel popups
    map.current.on("click", (e) => {
      setParcelClickLngLat([e.lngLat.lng, e.lngLat.lat]);
    });

    return () => {
      map.current?.remove();
      map.current = null;
      setMapInstance(null);
    };
  }, []);

  const handleInfrastructureClick = useCallback(
    (point: InfrastructurePoint) => {
      setSelectedParcel(null);
      setSelectedInfrastructure(point);
    },
    []
  );

  const handleParcelClick = useCallback((parcel: Parcel) => {
    setSelectedInfrastructure(null);
    setSelectedParcel(parcel);
  }, []);

  const handleCloseInfrastructurePopup = useCallback(() => {
    setSelectedInfrastructure(null);
  }, []);

  const handleCloseParcelPopup = useCallback(() => {
    setSelectedParcel(null);
  }, []);

  return (
    <div className={className}>
      <div ref={mapContainer} className="h-full w-full rounded-lg" />
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-slate-100">
          <div className="text-sm text-slate-500">Loading map...</div>
        </div>
      )}
      {mapLoaded && mapInstance && (
        <>
          <ParcelsLayer
            map={mapInstance}
            parcels={parcels}
            visible={layerVisibility.parcels}
            onParcelClick={handleParcelClick}
          />
          <InfrastructureLayer
            map={mapInstance}
            points={visibleInfrastructurePoints}
            visible={layerVisibility.infrastructure}
            onPointClick={handleInfrastructureClick}
          />
          <InfrastructurePopup
            map={mapInstance}
            point={selectedInfrastructure}
            isAdmin={isAdmin}
            onClose={handleCloseInfrastructurePopup}
          />
          <ParcelPopup
            map={mapInstance}
            parcel={selectedParcel}
            lngLat={parcelClickLngLat}
            onClose={handleCloseParcelPopup}
          />
          <LayerControls
            visibility={layerVisibility}
            onVisibilityChange={setLayerVisibility}
          />
          <Legend />
        </>
      )}
    </div>
  );
}
