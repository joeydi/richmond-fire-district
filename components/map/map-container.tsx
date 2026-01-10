"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import type {
  InfrastructurePoint,
  Parcel,
  InfrastructureType,
} from "@/lib/types/infrastructure";
import { getParcelsByViewport } from "@/lib/actions/map";
import { deleteInfrastructurePoint } from "@/lib/actions/infrastructure";
import { InfrastructureLayer } from "./infrastructure-layer";
import { ParcelsLayer } from "./parcels-layer";
import { InfrastructurePopup } from "./infrastructure-popup";
import { ParcelPopup } from "./parcel-popup";
import { LayerControls, type LayerVisibility } from "./layer-controls";
import { Legend } from "./legend";
import { InfrastructureForm } from "./infrastructure-form";
import { DeleteConfirmDialog } from "./delete-confirm-dialog";
import { Button } from "@/components/ui/button";

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
    other: true,
  },
};

interface MapContainerProps {
  className?: string;
  infrastructurePoints?: InfrastructurePoint[];
  isAdmin?: boolean;
  onRefresh?: () => void;
}

export function MapContainer({
  className,
  infrastructurePoints = [],
  isAdmin = false,
  onRefresh,
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

  // Add mode state
  const [isAddMode, setIsAddMode] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [newPointCoordinates, setNewPointCoordinates] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [editingPoint, setEditingPoint] = useState<InfrastructurePoint | null>(
    null
  );

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pointToDelete, setPointToDelete] = useState<InfrastructurePoint | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Handle add mode cursor and click
  useEffect(() => {
    if (!mapInstance) return;

    const handleAddModeClick = (e: mapboxgl.MapMouseEvent) => {
      if (isAddMode) {
        setNewPointCoordinates({
          lat: e.lngLat.lat,
          lng: e.lngLat.lng,
        });
        setFormOpen(true);
        setIsAddMode(false);
      }
    };

    const canvas = mapInstance.getCanvas();
    if (isAddMode) {
      if (canvas) canvas.style.cursor = "crosshair";
      mapInstance.on("click", handleAddModeClick);
    } else {
      if (canvas) canvas.style.cursor = "";
    }

    return () => {
      mapInstance.off("click", handleAddModeClick);
      const canvas = mapInstance.getCanvas();
      if (canvas && !isAddMode) {
        canvas.style.cursor = "";
      }
    };
  }, [mapInstance, isAddMode]);

  const handleInfrastructureClick = useCallback(
    (point: InfrastructurePoint) => {
      if (isAddMode) return; // Ignore clicks on points in add mode
      setSelectedParcel(null);
      setSelectedInfrastructure(point);
    },
    [isAddMode]
  );

  const handleParcelClick = useCallback(
    (parcel: Parcel) => {
      if (isAddMode) return; // Ignore clicks on parcels in add mode
      setSelectedInfrastructure(null);
      setSelectedParcel(parcel);
    },
    [isAddMode]
  );

  const handleCloseInfrastructurePopup = useCallback(() => {
    setSelectedInfrastructure(null);
  }, []);

  const handleCloseParcelPopup = useCallback(() => {
    setSelectedParcel(null);
  }, []);

  const handleFormSuccess = useCallback(() => {
    setFormOpen(false);
    setNewPointCoordinates(null);
    setEditingPoint(null);
    onRefresh?.();
  }, [onRefresh]);

  const handleFormClose = useCallback((open: boolean) => {
    setFormOpen(open);
    if (!open) {
      setNewPointCoordinates(null);
      setEditingPoint(null);
    }
  }, []);

  // Handle editing an infrastructure point
  const handleEditPoint = useCallback((point: InfrastructurePoint) => {
    setSelectedInfrastructure(null);
    setEditingPoint(point);
    setFormOpen(true);
  }, []);

  // Handle delete confirmation
  const handleDeletePoint = useCallback((point: InfrastructurePoint) => {
    setPointToDelete(point);
    setDeleteDialogOpen(true);
  }, []);

  // Confirm and execute delete
  const handleConfirmDelete = useCallback(async () => {
    if (!pointToDelete) return;

    setIsDeleting(true);
    try {
      const result = await deleteInfrastructurePoint(pointToDelete.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Infrastructure point deleted successfully");
        setSelectedInfrastructure(null);
        onRefresh?.();
      }
    } catch {
      toast.error("Failed to delete infrastructure point");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setPointToDelete(null);
    }
  }, [pointToDelete, onRefresh]);

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
            onEdit={handleEditPoint}
            onDelete={handleDeletePoint}
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

      {/* Add Point Button - Admin only */}
      {mapLoaded && isAdmin && (
        <div className="absolute bottom-4 right-4 z-10">
          {isAddMode ? (
            <div className="flex items-center gap-2">
              <div className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow">
                Click on map to place point
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsAddMode(false)}
                className="bg-white"
              >
                <X className="mr-1 h-4 w-4" />
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => setIsAddMode(true)}
              className="shadow-lg"
            >
              <Plus className="mr-1 h-4 w-4" />
              Add Point
            </Button>
          )}
        </div>
      )}

      {/* Infrastructure Form Modal */}
      <InfrastructureForm
        open={formOpen}
        onOpenChange={handleFormClose}
        point={editingPoint}
        initialCoordinates={newPointCoordinates || undefined}
        onSuccess={handleFormSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Infrastructure Point"
        description={`Are you sure you want to delete "${pointToDelete?.name}"? This action cannot be undone.`}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
