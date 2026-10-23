"use client";

import { useEffect, useRef } from "react";
import type { Map } from "mapbox-gl";
import type { InfrastructurePoint } from "@/lib/types/infrastructure";
import { INFRASTRUCTURE_COLORS } from "@/lib/types/infrastructure";

interface InfrastructureLayerProps {
  map: Map | null;
  points: InfrastructurePoint[];
  visible?: boolean;
  /**
   * Name labels appear from zoom 14 up. The report map turns them off so its
   * output is consistently dots-only, whatever zoom fitBounds settles on.
   */
  showLabels?: boolean;
  /** Drawn with a ring around it */
  selectedId?: string | null;
  onPointClick?: (point: InfrastructurePoint) => void;
}

const SOURCE_ID = "infrastructure-points";
const LAYER_ID = "infrastructure-layer";
const LABELS_LAYER_ID = "infrastructure-labels";
const SELECTED_LAYER_ID = "infrastructure-selected";
const SELECTED_COLOR = "#0891b2"; // --brand (cyan-600); map paint can't read CSS variables

export function InfrastructureLayer({
  map,
  points,
  visible = true,
  showLabels = true,
  selectedId = null,
  onPointClick,
}: InfrastructureLayerProps) {
  // The click handler is registered once, when the layer is added, so it reads
  // the latest points and callback through refs rather than stale closures
  const pointsRef = useRef(points);
  const onPointClickRef = useRef(onPointClick);
  useEffect(() => {
    pointsRef.current = points;
    onPointClickRef.current = onPointClick;
  });

  useEffect(() => {
    if (!map) return;

    // Convert points to GeoJSON
    const geojson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: points.map((point) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [point.longitude, point.latitude],
        },
        properties: {
          id: point.id,
          name: point.name,
          type: point.type,
          status: point.status,
          color: INFRASTRUCTURE_COLORS[point.type],
          ...point.properties,
        },
      })),
    };

    // Add source if it doesn't exist
    if (!map.getSource(SOURCE_ID)) {
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: geojson,
      });

      // Ring under the selected point
      map.addLayer({
        id: SELECTED_LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        filter: ["==", ["get", "id"], ""],
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 11, 15, 16, 20, 21],
          "circle-color": "rgba(0,0,0,0)",
          "circle-stroke-width": 3,
          "circle-stroke-color": SELECTED_COLOR,
        },
      });

      // Add circle layer for points
      map.addLayer({
        id: LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            10,
            6,
            15,
            10,
            20,
            14,
          ],
          "circle-color": ["get", "color"],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
          "circle-opacity": [
            "case",
            ["==", ["get", "status"], "inactive"],
            0.5,
            1,
          ],
        },
      });

      // Add labels layer
      map.addLayer({
        id: LABELS_LAYER_ID,
        type: "symbol",
        source: SOURCE_ID,
        minzoom: 14,
        layout: {
          "text-field": ["get", "name"],
          "text-font": ["DIN Pro Medium", "Arial Unicode MS Bold"],
          "text-size": 12,
          "text-offset": [0, 1.5],
          "text-anchor": "top",
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "#000000",
          "text-halo-width": 1,
        },
      });

      // Add click handler
      map.on("click", LAYER_ID, (e) => {
        const id = e.features?.[0]?.properties?.id;
        const point = pointsRef.current.find((p) => p.id === id);
        if (point) {
          onPointClickRef.current?.(point);
        }
      });

      // Change cursor on hover
      map.on("mouseenter", LAYER_ID, () => {
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", LAYER_ID, () => {
        map.getCanvas().style.cursor = "";
      });
    } else {
      // Update existing source
      const source = map.getSource(SOURCE_ID);
      if (source && "setData" in source) {
        source.setData(geojson);
      }
    }

    return () => {
      // Cleanup on unmount - check if map is still valid
      if (!map.getStyle()) return;

      if (map.getLayer(LABELS_LAYER_ID)) {
        map.removeLayer(LABELS_LAYER_ID);
      }
      if (map.getLayer(LAYER_ID)) {
        map.removeLayer(LAYER_ID);
      }
      if (map.getLayer(SELECTED_LAYER_ID)) {
        map.removeLayer(SELECTED_LAYER_ID);
      }
      if (map.getSource(SOURCE_ID)) {
        map.removeSource(SOURCE_ID);
      }
    };
  }, [map, points]);

  useEffect(() => {
    if (!map?.getLayer(SELECTED_LAYER_ID)) return;
    map.setFilter(SELECTED_LAYER_ID, ["==", ["get", "id"], selectedId ?? ""]);
  }, [map, points, selectedId]);

  // Toggle visibility
  useEffect(() => {
    if (!map) return;

    const visibility = visible ? "visible" : "none";

    if (map.getLayer(LAYER_ID)) {
      map.setLayoutProperty(LAYER_ID, "visibility", visibility);
    }
    if (map.getLayer(SELECTED_LAYER_ID)) {
      map.setLayoutProperty(SELECTED_LAYER_ID, "visibility", visibility);
    }
    if (map.getLayer(LABELS_LAYER_ID)) {
      map.setLayoutProperty(
        LABELS_LAYER_ID,
        "visibility",
        visible && showLabels ? "visible" : "none"
      );
    }
  }, [map, visible, showLabels]);

  return null;
}
