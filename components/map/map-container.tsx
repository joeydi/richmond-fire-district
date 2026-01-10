"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type {
  InfrastructurePoint,
  Parcel,
  InfrastructureType,
} from "@/lib/types/infrastructure";
import { getParcelsByViewport } from "@/lib/actions/map";
import { InfrastructureLayer } from "./infrastructure-layer";
import { ParcelsLayer } from "./parcels-layer";
import { InfrastructurePopup } from "./infrastructure-popup";
import { ParcelPopup } from "./parcel-popup";
import { LayerControls, type LayerVisibility } from "./layer-controls";
import { Legend } from "./legend";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

// Richmond, VT area coordinates
const DEFAULT_CENTER: [number, number] = [-72.944, 44.371];
const DEFAULT_ZOOM = 16;

// Debounce delay for viewport changes (ms)
const VIEWPORT_DEBOUNCE_MS = 300;

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
  isAdmin?: boolean;
}

export function MapContainer({
  className,
  infrastructurePoints = [],
  isAdmin = false,
}: MapContainerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null);

  // Layer visibility state
  const [layerVisibility, setLayerVisibility] =
    useState<LayerVisibility>(defaultLayerVisibility);

  // Dynamically loaded parcels
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [parcelsLoading, setParcelsLoading] = useState(false);

  // Popup state
  const [selectedInfrastructure, setSelectedInfrastructure] =
    useState<InfrastructurePoint | null>(null);
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [parcelClickLngLat, setParcelClickLngLat] = useState<
    [number, number] | undefined
  >(undefined);

  // Debounce timer ref
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Filter infrastructure points by visible types
  const visibleInfrastructurePoints = useMemo(() => {
    if (!layerVisibility.infrastructure) return [];
    return infrastructurePoints.filter(
      (point) =>
        layerVisibility.infrastructureTypes[point.type as InfrastructureType]
    );
  }, [
    infrastructurePoints,
    layerVisibility.infrastructure,
    layerVisibility.infrastructureTypes,
  ]);

  // Fetch parcels for current viewport
  const fetchParcelsForViewport = useCallback(async () => {
    if (!map.current) return;

    const bounds = map.current.getBounds();
    if (!bounds) return;

    setParcelsLoading(true);

    try {
      const viewportParcels = await getParcelsByViewport({
        minLng: bounds.getWest(),
        minLat: bounds.getSouth(),
        maxLng: bounds.getEast(),
        maxLat: bounds.getNorth(),
      });
      setParcels(viewportParcels);
    } catch (error) {
      console.error("Error fetching parcels:", error);
    } finally {
      setParcelsLoading(false);
    }
  }, []);

  // Debounced viewport change handler
  const handleViewportChange = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      fetchParcelsForViewport();
    }, VIEWPORT_DEBOUNCE_MS);
  }, [fetchParcelsForViewport]);

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

      // Initial parcel fetch
      fetchParcelsForViewport();
    });

    // Fetch parcels when viewport changes
    map.current.on("moveend", handleViewportChange);

    // Track click position for parcel popups
    map.current.on("click", (e) => {
      setParcelClickLngLat([e.lngLat.lng, e.lngLat.lat]);
    });

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      map.current?.remove();
      map.current = null;
      setMapInstance(null);
    };
  }, [fetchParcelsForViewport, handleViewportChange]);

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
      {parcelsLoading && (
        <div className="absolute right-16 top-4 z-10 rounded bg-white px-2 py-1 text-xs text-slate-500 shadow">
          Loading parcels...
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
