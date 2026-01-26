"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

// Richmond, VT coordinates
const RICHMOND_CENTER: [number, number] = [-72.942, 44.371];

export function AnimatedMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: RICHMOND_CENTER,
      zoom: 15.5,
      pitch: 65,
      bearing: 0,
      antialias: true,
      interactive: false,
    });

    map.current.on("style.load", () => {
      if (!map.current) return;

      // Add 3D terrain
      map.current.addSource("mapbox-dem", {
        type: "raster-dem",
        url: "mapbox://mapbox.mapbox-terrain-dem-v1",
        tileSize: 512,
        maxzoom: 14,
      });

      map.current.setTerrain({ source: "mapbox-dem", exaggeration: 1.25 });

      // Add sky atmosphere
      map.current.addLayer({
        id: "sky",
        type: "sky",
        paint: {
          "sky-type": "atmosphere",
          "sky-atmosphere-sun": [0.0, 90.0],
          "sky-atmosphere-sun-intensity": 15,
        },
      });

      // Start the rotation animation
      const rotateCamera = (timestamp: number) => {
        if (!map.current) return;

        // Rotate the camera at a slow rate
        const rotationSpeed = 0.004;
        map.current.rotateTo((timestamp * rotationSpeed) % 360, {
          duration: 0,
        });

        animationRef.current = requestAnimationFrame(rotateCamera);
      };

      animationRef.current = requestAnimationFrame(rotateCamera);
    });

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      map.current?.remove();
      map.current = null;
    };
  }, []);

  return (
    <div ref={mapContainer} className="h-full w-full" />
  );
}
