"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import type { Map } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { InfrastructureLayer } from "./infrastructure-layer";
import { ParcelsLayer } from "./parcels-layer";
import {
  REPORT_MAP_MAX_ZOOM,
  REPORT_MAP_PADDING,
} from "@/lib/pdf/map-bounds";
import type {
  InfrastructurePoint,
  Parcel,
  ViewportBounds,
} from "@/lib/types/infrastructure";

/**
 * Off-screen map rendered solely to be captured as a still image for the
 * infrastructure PDF report.
 *
 * This is deliberately not MapContainer: that component owns navigation
 * controls, popups, add-point mode, and a moveend-driven parcel fetch, none of
 * which belong in a screenshot. It does share the two headless layer
 * components, so parcels and points render identically to the dashboard map.
 */

const MAP_STYLE = "mapbox://styles/mapbox/satellite-streets-v12";
const CAPTURE_QUALITY = 0.85;

/** Give up rather than hang the download if tiles never finish loading. */
const CAPTURE_TIMEOUT_MS = 15_000;

interface ReportMapProps {
  points: InfrastructurePoint[];
  parcels: Parcel[];
  bounds: ViewportBounds;
  /** Called exactly once with a JPEG data URL, or null if capture failed. */
  onReady: (dataUrl: string | null) => void;
}

export function ReportMap({
  points,
  parcels,
  bounds,
  onReady,
}: ReportMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const [map, setMap] = useState<Map | null>(null);

  // onReady must fire exactly once: the timeout and the idle handler race.
  const settledRef = useRef(false);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  const settle = (dataUrl: string | null) => {
    if (settledRef.current) return;
    settledRef.current = true;
    onReadyRef.current(dataUrl);
  };

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    if (!mapboxgl.accessToken) {
      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
    }
    if (!mapboxgl.accessToken) {
      console.error("Cannot render report map: NEXT_PUBLIC_MAPBOX_TOKEN unset");
      settle(null);
      return;
    }

    let instance: Map;
    try {
      instance = new mapboxgl.Map({
        container: containerRef.current,
        style: MAP_STYLE,
        bounds: [
          [bounds.minLng, bounds.minLat],
          [bounds.maxLng, bounds.maxLat],
        ],
        fitBoundsOptions: {
          padding: REPORT_MAP_PADDING,
          maxZoom: REPORT_MAP_MAX_ZOOM,
        },
        interactive: false,
        // Required for getCanvas().toDataURL(); without it the WebGL buffer is
        // cleared after each frame and the capture comes back blank.
        preserveDrawingBuffer: true,
        // The attribution control is DOM, so it cannot appear in a canvas
        // capture. The PDF renders the credit line beneath the image instead.
        attributionControl: false,
      });
    } catch (error) {
      console.error("Error creating report map:", error);
      settle(null);
      return;
    }

    mapRef.current = instance;
    instance.on("error", (e) => console.error("Report map error:", e.error));
    instance.on("load", () => setMap(instance));

    const timeout = setTimeout(() => {
      console.error("Report map timed out before it finished rendering");
      settle(null);
    }, CAPTURE_TIMEOUT_MS);

    return () => {
      clearTimeout(timeout);
      instance.remove();
      mapRef.current = null;
    };
    // Inputs are captured once; this component is mounted per capture.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // React runs child effects before the parent's, so by the time this fires the
  // layer components have already added their sources and layers to the map.
  useEffect(() => {
    if (!map) return;

    const capture = () => {
      // idle can fire while tiles are still resolving; wait for the next one.
      if (!map.areTilesLoaded()) {
        map.once("idle", capture);
        return;
      }
      try {
        settle(map.getCanvas().toDataURL("image/jpeg", CAPTURE_QUALITY));
      } catch (error) {
        console.error("Error capturing report map:", error);
        settle(null);
      }
    };

    map.once("idle", capture);
  }, [map]);

  return (
    <>
      {/* Mapbox appends its canvas into this div, so nothing else renders inside it. */}
      <div ref={containerRef} className="h-full w-full" />

      {/* InfrastructureLayer must mount first: ParcelsLayer inserts its layers
          with beforeId "infrastructure-layer", which throws if absent. */}
      <InfrastructureLayer map={map} points={points} showLabels={false} />
      <ParcelsLayer map={map} parcels={parcels} />
    </>
  );
}
