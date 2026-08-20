import type { ViewportBounds } from "@/lib/types/infrastructure";

/** Fraction of the point spread added as breathing room on each side. */
const PADDING_RATIO = 0.15;

/**
 * Smallest ground distance the returned box may span on either axis.
 *
 * A single point — or several at effectively the same spot — produces a
 * zero-width box, which fitBounds would resolve to its maximum zoom. This only
 * needs to be large enough to give a degenerate box some context; anything
 * bigger needlessly widens the frame for a genuinely compact district.
 */
const MIN_SPAN_METRES = 250;

const METRES_PER_DEGREE_LAT = 111_320;

/**
 * Backstop on fitBounds zoom.
 *
 * This should never actually bind — MIN_SPAN_METRES is what governs how tight a
 * degenerate box gets. Set it too low and it quietly becomes the thing deciding
 * the framing, which is what made the first version of this map render far more
 * zoomed out than the points warranted.
 */
export const REPORT_MAP_MAX_ZOOM = 20;

/**
 * Padding, in pixels, between the fitted bounds and the edge of the map canvas.
 *
 * Must clear the point markers' radius, which reaches ~14px plus a 2px stroke at
 * high zoom (see components/map/infrastructure-layer.tsx), or edge points get
 * clipped. On a 1600px capture this is 2% of the frame.
 */
export const REPORT_MAP_PADDING = 32;

/**
 * Pixel size of the off-screen capture.
 *
 * Mapbox sizes its canvas as the container box times devicePixelRatio, which is
 * 1 on a non-retina display, so ask for a physically large container rather
 * than relying on the ratio. At roughly 7in wide in the PDF this lands around
 * 220 DPI.
 */
export const REPORT_MAP_WIDTH = 1600;
export const REPORT_MAP_HEIGHT = 1300;

/**
 * Shared so the PDF can size the image from the same numbers the capture uses.
 * Lives here rather than alongside the capture helper because that module pulls
 * in mapbox-gl, which must stay out of the PDF document bundle.
 */
export const REPORT_MAP_ASPECT_RATIO = REPORT_MAP_WIDTH / REPORT_MAP_HEIGHT;

interface HasCoordinates {
  latitude: number;
  longitude: number;
}

/**
 * Bounding box covering every given point, padded for display.
 *
 * Returns null when there are no points, which the report treats as "render
 * without a map" rather than as an error.
 */
export function boundsForPoints(
  points: HasCoordinates[]
): ViewportBounds | null {
  if (points.length === 0) return null;

  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  for (const point of points) {
    if (!Number.isFinite(point.longitude) || !Number.isFinite(point.latitude)) {
      continue;
    }
    minLng = Math.min(minLng, point.longitude);
    maxLng = Math.max(maxLng, point.longitude);
    minLat = Math.min(minLat, point.latitude);
    maxLat = Math.max(maxLat, point.latitude);
  }

  if (!Number.isFinite(minLng) || !Number.isFinite(minLat)) return null;

  // Re-centre on the adjusted spans so a degenerate box grows in both directions.
  const centerLng = (minLng + maxLng) / 2;
  const centerLat = (minLat + maxLat) / 2;

  // A degree of longitude covers less ground than a degree of latitude, by this
  // factor. Both the minimum span and the aspect ratio are ground measurements,
  // so neither can be reasoned about in raw degrees.
  const cosLat = Math.max(Math.cos((centerLat * Math.PI) / 180), 0.01);

  const minLatSpan = MIN_SPAN_METRES / METRES_PER_DEGREE_LAT;
  let latSpan = Math.max(maxLat - minLat, minLatSpan);
  let lngSpan = Math.max(maxLng - minLng, minLatSpan / cosLat);

  // Grow the narrower axis until the box is the same shape as the canvas.
  // Without this fitBounds has to letterbox — it fits the whole box inside the
  // frame, so the axis that doesn't match is left with dead space on both sides.
  const groundAspect = (lngSpan * cosLat) / latSpan;
  if (groundAspect < REPORT_MAP_ASPECT_RATIO) {
    lngSpan = (REPORT_MAP_ASPECT_RATIO * latSpan) / cosLat;
  } else {
    latSpan = (lngSpan * cosLat) / REPORT_MAP_ASPECT_RATIO;
  }

  const halfLng = (lngSpan / 2) * (1 + PADDING_RATIO);
  const halfLat = (latSpan / 2) * (1 + PADDING_RATIO);

  return {
    minLng: centerLng - halfLng,
    minLat: centerLat - halfLat,
    maxLng: centerLng + halfLng,
    maxLat: centerLat + halfLat,
  };
}
