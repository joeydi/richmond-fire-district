import { createRoot } from "react-dom/client";
import { ReportMap } from "@/components/map/report-map";
import { REPORT_MAP_HEIGHT, REPORT_MAP_WIDTH } from "@/lib/pdf/map-bounds";
import type {
  InfrastructurePoint,
  Parcel,
  ViewportBounds,
} from "@/lib/types/infrastructure";

interface CaptureMapOptions {
  points: InfrastructurePoint[];
  parcels: Parcel[];
  bounds: ViewportBounds;
}

/**
 * Renders ReportMap into a detached React root, waits for it to finish drawing,
 * and resolves with a JPEG data URL — or null if the map could not be rendered.
 *
 * The download handler is imperative while the map layers are React components,
 * so this bridges the two. Callers must treat null as "carry on without a map".
 */
export async function captureReportMap({
  points,
  parcels,
  bounds,
}: CaptureMapOptions): Promise<string | null> {
  if (typeof document === "undefined") return null;

  const container = document.createElement("div");
  // Mapbox measures the container box, so it has to be genuinely laid out.
  // Positioning it off-screen keeps it invisible; display:none would give it
  // zero size and produce an empty map.
  container.style.cssText = [
    "position:fixed",
    "left:-10000px",
    "top:0",
    `width:${REPORT_MAP_WIDTH}px`,
    `height:${REPORT_MAP_HEIGHT}px`,
    "pointer-events:none",
  ].join(";");
  document.body.appendChild(container);

  const root = createRoot(container);

  try {
    return await new Promise<string | null>((resolve) => {
      root.render(
        <ReportMap
          points={points}
          parcels={parcels}
          bounds={bounds}
          onReady={resolve}
        />
      );
    });
  } catch (error) {
    console.error("Error capturing report map:", error);
    return null;
  } finally {
    // Deferred: unmounting synchronously from inside a React commit warns, and
    // the resolve above can run during one.
    setTimeout(() => {
      root.unmount();
      container.remove();
    }, 0);
  }
}
