"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Plus, X } from "lucide-react";
import type {
  InfrastructurePoint,
  Parcel,
  InfrastructureType,
} from "@/lib/types/infrastructure";
import { getParcelsByViewport } from "@/lib/actions/map";
import { InfrastructureLayer } from "./infrastructure-layer";
import { ParcelsLayer } from "./parcels-layer";
import { ImageryLayer } from "./imagery-layer";
import { ParcelPopup } from "./parcel-popup";
import { LayerControls, type LayerVisibility } from "./layer-controls";
import { Button } from "@/components/ui/button";
import type { LatLng } from "@/components/infrastructure/point-form";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

// Richmond, VT area coordinates
const DEFAULT_CENTER: [number, number] = [-72.944, 44.371];
const DEFAULT_ZOOM = 16;

// Debounce delay for viewport changes (ms)
const VIEWPORT_DEBOUNCE_MS = 300;

// Zoom when flying to a point picked outside the map (a link, the sheet's nearest list)
const FOCUS_ZOOM = 18;
const DRAFT_MARKER_COLOR = "#0891b2"; // --brand

const defaultLayerVisibility: LayerVisibility = {
  imagery: true,
  infrastructure: true,
  parcels: true,
  infrastructureTypes: {
    shutoff_valve: true,
    hydrant: true,
    well: true,
    meter: true,
    reservoir: true,
    other: true,
  },
};

interface MapContainerProps {
  className?: string;
  infrastructurePoints?: InfrastructurePoint[];
  isAdmin?: boolean;
  /** Ringed on the map; details live in the page's side sheet */
  selectedId?: string | null;
  onPointSelect?: (point: InfrastructurePoint) => void;
  /** Add mode: the next map click calls this with the clicked location */
  onAddPoint?: (location: LatLng) => void;
  /** While a point form is open, map clicks set its location instead of selecting */
  onPickLocation?: ((location: LatLng) => void) | null;
  /** Marker for the location being edited or added */
  draftLocation?: LatLng | null;
  /** Fly here whenever this changes */
  focus?: (LatLng & { key: string }) | null;
}

export function MapContainer({
  className,
  infrastructurePoints = [],
  isAdmin = false,
  selectedId = null,
  onPointSelect,
  onAddPoint,
  onPickLocation = null,
  draftLocation = null,
  focus = null,
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

  // Parcel popup state
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [parcelClickLngLat, setParcelClickLngLat] = useState<
    [number, number] | undefined
  >(undefined);

  const [isAddMode, setIsAddMode] = useState(false);
  const isPicking = isAddMode || !!onPickLocation;

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

  const typeCounts = useMemo(() => {
    const counts: Record<InfrastructureType, number> = {
      shutoff_valve: 0,
      hydrant: 0,
      well: 0,
      meter: 0,
      reservoir: 0,
      other: 0,
    };
    for (const point of infrastructurePoints) counts[point.type]++;
    return counts;
  }, [infrastructurePoints]);

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

    // Track click position for parcel popups and add mode
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

  // Add mode and location picking take over map clicks
  useEffect(() => {
    if (!mapInstance || !isPicking) return;

    const handlePickClick = (e: mapboxgl.MapMouseEvent) => {
      // ~10 cm, matching "Use my location"
      const location = { lat: Number(e.lngLat.lat.toFixed(6)), lng: Number(e.lngLat.lng.toFixed(6)) };
      if (isAddMode) {
        setIsAddMode(false);
        onAddPoint?.(location);
      } else {
        onPickLocation?.(location);
      }
    };

    const canvas = mapInstance.getCanvas();
    canvas.style.cursor = "crosshair";
    mapInstance.on("click", handlePickClick);

    return () => {
      mapInstance.off("click", handlePickClick);
      canvas.style.cursor = "";
    };
  }, [mapInstance, isPicking, isAddMode, onAddPoint, onPickLocation]);

  // Esc leaves add mode
  useEffect(() => {
    if (!isAddMode) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsAddMode(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isAddMode]);

  // Draft marker for the location being added or edited
  const draftMarker = useRef<mapboxgl.Marker | null>(null);
  useEffect(() => {
    if (!mapInstance) return;
    if (!draftLocation) {
      draftMarker.current?.remove();
      draftMarker.current = null;
      return;
    }
    if (!draftMarker.current) {
      draftMarker.current = new mapboxgl.Marker({ color: DRAFT_MARKER_COLOR, scale: 0.8 });
    }
    draftMarker.current.setLngLat([draftLocation.lng, draftLocation.lat]).addTo(mapInstance);
  }, [mapInstance, draftLocation]);
  useEffect(
    () => () => {
      draftMarker.current?.remove();
    },
    []
  );

  useEffect(() => {
    if (!mapInstance || !focus) return;
    mapInstance.flyTo({
      center: [focus.lng, focus.lat],
      zoom: Math.max(mapInstance.getZoom(), FOCUS_ZOOM),
      duration: 800,
    });
    // Only re-fly when the focus target changes, not when its object identity does
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapInstance, focus?.key]);

  // The page's side sheet changes the map's width; Mapbox only notices window resizes
  useEffect(() => {
    if (!mapInstance || !mapContainer.current) return;
    const observer = new ResizeObserver(() => mapInstance.resize());
    observer.observe(mapContainer.current);
    return () => observer.disconnect();
  }, [mapInstance]);

  const handleInfrastructureClick = useCallback(
    (point: InfrastructurePoint) => {
      if (isPicking) return; // Clicks set a location while adding or editing
      setSelectedParcel(null);
      onPointSelect?.(point);
    },
    [isPicking, onPointSelect]
  );

  const handleParcelClick = useCallback(
    (parcel: Parcel) => {
      if (isPicking) return;
      setSelectedParcel(parcel);
    },
    [isPicking]
  );

  const handleCloseParcelPopup = useCallback(() => {
    setSelectedParcel(null);
  }, []);

  return (
    <div className={className}>
      <div ref={mapContainer} className="h-full w-full" />
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-100">
          <div className="font-mono text-[11px] text-muted-foreground">LOADING MAP…</div>
        </div>
      )}
      {parcelsLoading && (
        <div className="absolute top-4 right-16 z-10 rounded-md bg-background/90 px-2 py-1 font-mono text-[10px] text-muted-foreground shadow-sm">
          LOADING PARCELS…
        </div>
      )}
      {mapLoaded && mapInstance && (
        <>
          <ImageryLayer map={mapInstance} visible={layerVisibility.imagery} />
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
            selectedId={selectedId}
            onPointClick={handleInfrastructureClick}
          />
          <ParcelPopup
            map={mapInstance}
            parcel={selectedParcel}
            lngLat={parcelClickLngLat}
            points={infrastructurePoints}
            onPointSelect={(point) => {
              setSelectedParcel(null);
              onPointSelect?.(point);
            }}
            onClose={handleCloseParcelPopup}
          />
          <LayerControls
            visibility={layerVisibility}
            onVisibilityChange={setLayerVisibility}
            typeCounts={typeCounts}
            parcelCount={parcels.length}
          />
        </>
      )}

      {/* Add point: admin only, and not while a point form already has the map */}
      {mapLoaded && isAdmin && onAddPoint && !onPickLocation && (
        <div className="absolute right-4 bottom-8 z-10">
          {isAddMode ? (
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-zinc-900/90 px-2.5 py-1.5 font-mono text-[11px] text-white shadow-sm">
                CLICK THE MAP TO PLACE THE POINT
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsAddMode(false)}
                className="h-7 bg-background px-2.5 text-xs"
              >
                <X className="size-3.5" />
                Cancel
              </Button>
            </div>
          ) : (
            <Button size="sm" className="h-7 px-2.5 text-xs shadow-md" onClick={() => setIsAddMode(true)}>
              <Plus className="size-3.5" />
              Point
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
