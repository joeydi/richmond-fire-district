"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  INFRASTRUCTURE_LABELS,
  INFRASTRUCTURE_COLORS,
  type InfrastructureType,
} from "@/lib/types/infrastructure";

export interface LayerVisibility {
  infrastructure: boolean;
  parcels: boolean;
  infrastructureTypes: Record<InfrastructureType, boolean>;
}

interface LayerControlsProps {
  visibility: LayerVisibility;
  onVisibilityChange: (visibility: LayerVisibility) => void;
  /** Points per type, shown beside each toggle */
  typeCounts: Record<InfrastructureType, number>;
  /** Parcels loaded for the current view */
  parcelCount: number;
}

const infrastructureTypes: InfrastructureType[] = [
  "shutoff_valve",
  "hydrant",
  "well",
  "meter",
  "reservoir",
  "other",
];

// Matches the parcels layer's line color
const PARCEL_COLOR = "#60a5fa";

/** Map panel shell shared by the layer toggles */
export function MapPanel({
  title,
  expanded,
  onToggle,
  className,
  children,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "w-56 overflow-hidden rounded-lg border bg-background/95 text-xs shadow-sm backdrop-blur",
        className
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex h-8 w-full items-center px-3 font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase hover:text-foreground"
      >
        <span className="flex-1 text-left">{title}</span>
        {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
      </button>
      {expanded && <div className="border-t">{children}</div>}
    </div>
  );
}

function ToggleRow({
  checked,
  onChange,
  swatch,
  label,
  count,
  disabled,
  strong,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  swatch?: React.ReactNode;
  label: string;
  count?: number;
  disabled?: boolean;
  strong?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex h-7 cursor-pointer items-center gap-2 px-3 hover:bg-zinc-50",
        disabled && "cursor-not-allowed opacity-40 hover:bg-transparent"
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-brand"
      />
      {swatch}
      <span className={cn("flex-1 truncate", strong ? "font-medium" : "text-zinc-700")}>{label}</span>
      {count !== undefined && <span className="font-mono text-[11px] text-muted-foreground">{count}</span>}
    </label>
  );
}

/** Layer toggles that double as the map's legend: each row carries its symbol and count */
export function LayerControls({ visibility, onVisibilityChange, typeCounts, parcelCount }: LayerControlsProps) {
  // Panels mount after the map loads, so reading the viewport here can't cause a hydration mismatch
  const [isExpanded, setIsExpanded] = useState(() => window.matchMedia("(min-width: 640px)").matches);
  const totalPoints = infrastructureTypes.reduce((sum, type) => sum + typeCounts[type], 0);

  const setTypeVisible = (type: InfrastructureType, checked: boolean) =>
    onVisibilityChange({
      ...visibility,
      infrastructureTypes: { ...visibility.infrastructureTypes, [type]: checked },
    });

  return (
    <MapPanel
      title="Layers"
      expanded={isExpanded}
      onToggle={() => setIsExpanded(!isExpanded)}
      className="absolute top-4 left-4 z-10"
    >
      <div className="py-1">
        <ToggleRow
          strong
          label="Infrastructure"
          count={totalPoints}
          checked={visibility.infrastructure}
          onChange={(checked) => onVisibilityChange({ ...visibility, infrastructure: checked })}
        />
        <div className="pl-4">
          {infrastructureTypes.map((type) => (
            <ToggleRow
              key={type}
              label={INFRASTRUCTURE_LABELS[type]}
              count={typeCounts[type]}
              disabled={!visibility.infrastructure || typeCounts[type] === 0}
              checked={visibility.infrastructureTypes[type]}
              onChange={(checked) => setTypeVisible(type, checked)}
              swatch={
                <span
                  aria-hidden="true"
                  className="size-2.5 shrink-0 rounded-full ring-2 ring-white"
                  style={{ backgroundColor: INFRASTRUCTURE_COLORS[type] }}
                />
              }
            />
          ))}
        </div>
        <ToggleRow
          strong
          label="Parcels"
          count={parcelCount}
          checked={visibility.parcels}
          onChange={(checked) => onVisibilityChange({ ...visibility, parcels: checked })}
          swatch={
            <span
              aria-hidden="true"
              className="size-2.5 shrink-0 rounded-[2px] border-[1.5px]"
              style={{ borderColor: PARCEL_COLOR, backgroundColor: `${PARCEL_COLOR}33` }}
            />
          }
        />
      </div>
      <div className="flex items-center gap-2 border-t px-3 py-2 text-[11px] text-muted-foreground">
        <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full bg-zinc-500 opacity-50 ring-2 ring-white" />
        Faded points are inactive
      </div>
    </MapPanel>
  );
}
