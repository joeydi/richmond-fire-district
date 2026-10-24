"use client";

import { useEffect } from "react";
import type { Map } from "mapbox-gl";

interface ImageryLayerProps {
  map: Map | null;
  visible?: boolean;
}

const SOURCE_ID = "vcgi-imagery";
const LAYER_ID = "vcgi-imagery";

// VCGI "Best of Color" orthoimagery, cached in Web Mercator
const TILE_URL =
  "https://maps.vcgi.vermont.gov/arcgis/rest/services/EGC_services/IMG_VCGI_CLR_WM_CACHE/ImageServer/tile/{z}/{y}/{x}";

// Service extent (Vermont), so Mapbox doesn't request tiles outside it
const BOUNDS: [number, number, number, number] = [-73.47, 42.7, -71.44, 45.04];

// The cache has tiles through z19 here; Mapbox overzooms past that
const MAX_ZOOM = 19;

export function ImageryLayer({ map, visible = true }: ImageryLayerProps) {
  useEffect(() => {
    if (!map || map.getSource(SOURCE_ID)) return;

    map.addSource(SOURCE_ID, {
      type: "raster",
      tiles: [TILE_URL],
      tileSize: 256,
      bounds: BOUNDS,
      maxzoom: MAX_ZOOM,
      attribution: '<a href="https://vcgi.vermont.gov" target="_blank">VCGI</a>',
    });

    // Directly above Mapbox's satellite raster, so roads and labels still draw on top
    const layers = map.getStyle()?.layers ?? [];
    const satelliteIndex = layers.findIndex((layer) => layer.id === "satellite");
    const beforeId = satelliteIndex >= 0 ? layers[satelliteIndex + 1]?.id : undefined;

    map.addLayer({ id: LAYER_ID, type: "raster", source: SOURCE_ID }, beforeId);
  }, [map]);

  useEffect(() => {
    if (!map || !map.getLayer(LAYER_ID)) return;
    map.setLayoutProperty(LAYER_ID, "visibility", visible ? "visible" : "none");
  }, [map, visible]);

  return null;
}
