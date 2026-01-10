"use client";

import { useEffect, useState } from "react";
import type { Map } from "mapbox-gl";
import type { Parcel } from "@/lib/types/infrastructure";

interface ParcelsLayerProps {
  map: Map | null;
  parcels: Parcel[];
  visible?: boolean;
  onParcelClick?: (parcel: Parcel) => void;
}

const SOURCE_ID = "parcels";
const FILL_LAYER_ID = "parcels-fill";
const LINE_LAYER_ID = "parcels-line";
const HIGHLIGHT_LAYER_ID = "parcels-highlight";

export function ParcelsLayer({
  map,
  parcels,
  visible = true,
  onParcelClick,
}: ParcelsLayerProps) {
  const [hoveredParcelId, setHoveredParcelId] = useState<string | null>(null);

  useEffect(() => {
    if (!map || parcels.length === 0) return;

    // Convert parcels to GeoJSON FeatureCollection
    const geojson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: parcels.map((parcel) => ({
        type: "Feature",
        id: parcel.id,
        geometry: parcel.geometry,
        properties: {
          id: parcel.id,
          parcel_id: parcel.parcel_id,
          owner_name: parcel.owner_name,
          address: parcel.address,
        },
      })),
    };

    // Add source if it doesn't exist
    if (!map.getSource(SOURCE_ID)) {
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: geojson,
        generateId: true,
      });

      // Add fill layer (transparent)
      map.addLayer(
        {
          id: FILL_LAYER_ID,
          type: "fill",
          source: SOURCE_ID,
          paint: {
            "fill-color": "#3B82F6",
            "fill-opacity": [
              "case",
              ["boolean", ["feature-state", "hover"], false],
              0.3,
              0.1,
            ],
          },
        },
        "infrastructure-layer" // Add below infrastructure layer
      );

      // Add line layer for boundaries
      map.addLayer(
        {
          id: LINE_LAYER_ID,
          type: "line",
          source: SOURCE_ID,
          paint: {
            "line-color": [
              "case",
              ["boolean", ["feature-state", "hover"], false],
              "#2563EB",
              "#60A5FA",
            ],
            "line-width": [
              "case",
              ["boolean", ["feature-state", "hover"], false],
              2,
              1,
            ],
          },
        },
        "infrastructure-layer"
      );

      // Hover handlers
      map.on("mousemove", FILL_LAYER_ID, (e) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          const featureId = feature.id as string;

          if (hoveredParcelId !== null && hoveredParcelId !== featureId) {
            map.setFeatureState(
              { source: SOURCE_ID, id: hoveredParcelId },
              { hover: false }
            );
          }

          map.setFeatureState(
            { source: SOURCE_ID, id: featureId },
            { hover: true }
          );
          setHoveredParcelId(featureId);
          map.getCanvas().style.cursor = "pointer";
        }
      });

      map.on("mouseleave", FILL_LAYER_ID, () => {
        if (hoveredParcelId !== null) {
          map.setFeatureState(
            { source: SOURCE_ID, id: hoveredParcelId },
            { hover: false }
          );
        }
        setHoveredParcelId(null);
        map.getCanvas().style.cursor = "";
      });

      // Click handler
      map.on("click", FILL_LAYER_ID, (e) => {
        if (e.features && e.features[0] && onParcelClick) {
          const feature = e.features[0];
          const parcel = parcels.find(
            (p) => p.id === feature.properties?.id
          );
          if (parcel) {
            onParcelClick(parcel);
          }
        }
      });
    } else {
      // Update existing source
      const source = map.getSource(SOURCE_ID);
      if (source && "setData" in source) {
        source.setData(geojson);
      }
    }

    return () => {
      // Cleanup on unmount
      if (map.getLayer(LINE_LAYER_ID)) {
        map.removeLayer(LINE_LAYER_ID);
      }
      if (map.getLayer(FILL_LAYER_ID)) {
        map.removeLayer(FILL_LAYER_ID);
      }
      if (map.getSource(SOURCE_ID)) {
        map.removeSource(SOURCE_ID);
      }
    };
  }, [map, parcels, onParcelClick, hoveredParcelId]);

  // Toggle visibility
  useEffect(() => {
    if (!map) return;

    const visibility = visible ? "visible" : "none";

    if (map.getLayer(FILL_LAYER_ID)) {
      map.setLayoutProperty(FILL_LAYER_ID, "visibility", visibility);
    }
    if (map.getLayer(LINE_LAYER_ID)) {
      map.setLayoutProperty(LINE_LAYER_ID, "visibility", visibility);
    }
  }, [map, visible]);

  return null;
}
