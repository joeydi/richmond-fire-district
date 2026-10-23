import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { INFRASTRUCTURE_COLORS, type InfrastructureType } from "@/lib/types/infrastructure";

// 3:2, matching the container's aspect ratio
const WIDTH = 420;
const HEIGHT = 280;
const ZOOM = 17;
// Mapbox static images use 512px tiles
const WORLD_PX = 512 * 2 ** ZOOM;
const SCALE_BAR_M = 50;

interface MapPoint {
  id: string;
  name: string;
  type: InfrastructureType;
  latitude: number;
  longitude: number;
}

interface PointMapPreviewProps {
  point: MapPoint;
  nearby: MapPoint[];
}

const mercatorY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));

/** Leading house number, else initials ("Extension Flush Hydrant" → EFH), as a compact map label */
function shortLabel(name: string): string {
  return (
    name.match(/^\d+[A-Za-z]?/)?.[0] ??
    name
      .split(/\s+/)
      .map((word) => word[0])
      .join("")
      .slice(0, 3)
      .toUpperCase()
  );
}

export function PointMapPreview({ point, nearby }: PointMapPreviewProps) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const { latitude: lat0, longitude: lon0 } = point;

  // Rounded so the server-rendered style string matches the client's on hydration
  const round = (n: number) => Math.round(n * 100) / 100;
  const toPercent = (p: MapPoint) => {
    const dx = ((p.longitude - lon0) / 360) * WORLD_PX;
    const dy = ((mercatorY(lat0) - mercatorY(p.latitude)) / (2 * Math.PI)) * WORLD_PX;
    return { left: round(50 + (dx / WIDTH) * 100), top: round(50 + (dy / HEIGHT) * 100) };
  };

  const metersPerPx = (40075016.686 * Math.cos((lat0 * Math.PI) / 180)) / WORLD_PX;
  const scaleBarPercent = round((SCALE_BAR_M / metersPerPx / WIDTH) * 100);

  const dots = [
    ...nearby.map((p) => ({ ...p, selected: false })),
    { ...point, selected: true },
  ]
    .map((p) => ({ ...p, pos: toPercent(p) }))
    .filter(({ pos }) => pos.left > 2 && pos.left < 98 && pos.top > 4 && pos.top < 96);

  const src = token
    ? `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/${lon0},${lat0},${ZOOM},0/${WIDTH}x${HEIGHT}@2x?attribution=false&logo=false&access_token=${token}`
    : null;

  return (
    <div
      role="img"
      aria-label={`Map of ${point.name} and ${dots.length - 1} nearby points`}
      className="relative aspect-[3/2] overflow-hidden rounded-md border bg-zinc-100"
    >
      {src && (
        <Image src={src} alt="" fill unoptimized className="object-cover" sizes={`${WIDTH}px`} />
      )}
      {dots.map((dot) => (
        <div
          key={dot.id}
          className="absolute"
          style={{ left: `${dot.pos.left}%`, top: `${dot.pos.top}%` }}
          title={dot.name}
        >
          <span
            className={cn(
              "absolute -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white",
              dot.selected ? "size-3 bg-brand" : "size-2"
            )}
            style={dot.selected ? undefined : { backgroundColor: INFRASTRUCTURE_COLORS[dot.type] }}
          />
          <span
            className={cn(
              "absolute left-2 -translate-y-1/2 rounded-sm bg-white/85 px-1 font-mono text-[10px] leading-4 whitespace-nowrap",
              dot.selected ? "font-semibold text-foreground" : "text-zinc-600"
            )}
          >
            {shortLabel(dot.name)}
          </span>
        </div>
      ))}
      <span className="absolute bottom-3.5 left-2 rounded-sm bg-white/85 px-1 font-mono text-[10px] leading-4 text-zinc-700">
        {SCALE_BAR_M} m
      </span>
      <span
        aria-hidden="true"
        className="absolute bottom-2 left-2 h-1.5 border-x-2 border-b-2 border-white shadow-[0_1px_2px_rgb(0_0_0/0.6)]"
        style={{ width: `${scaleBarPercent}%` }}
      />
      <Link
        href="/dashboard/map"
        className="absolute top-1.5 right-1.5 rounded-sm border bg-white/90 px-1.5 py-0.5 font-mono text-[10px] text-foreground hover:bg-white"
      >
        OPEN MAP ↗
      </Link>
      <span className="absolute right-1.5 bottom-1 text-[9px] text-white/90 [text-shadow:0_0_2px_rgb(0_0_0/0.8)]">
        © Mapbox © OpenStreetMap
      </span>
    </div>
  );
}
