"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  INFRASTRUCTURE_LABELS,
  INFRASTRUCTURE_COLORS,
  type InfrastructureType,
} from "@/lib/types/infrastructure";

const infrastructureTypes: InfrastructureType[] = [
  "shutoff_valve",
  "hydrant",
  "well",
  "meter",
  "reservoir",
];

const statusColors = [
  { label: "Active", color: "bg-green-500" },
  { label: "Inactive", color: "bg-gray-400" },
  { label: "Maintenance", color: "bg-yellow-500" },
];

export function Legend() {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="absolute bottom-8 left-4 z-10 w-56 rounded-lg bg-white shadow-lg">
      <Button
        variant="ghost"
        className="flex w-full items-center justify-between px-3 py-2"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="flex items-center gap-2">
          <Info className="h-4 w-4" />
          <span className="font-medium">Legend</span>
        </span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </Button>

      {isExpanded && (
        <div className="border-t p-3 space-y-3">
          {/* Infrastructure Types */}
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
              Infrastructure
            </div>
            <div className="space-y-1.5">
              {infrastructureTypes.map((type) => (
                <div key={type} className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: INFRASTRUCTURE_COLORS[type] }}
                  />
                  <span className="text-sm text-slate-700">
                    {INFRASTRUCTURE_LABELS[type]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Status Colors */}
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
              Status
            </div>
            <div className="flex gap-3">
              {statusColors.map(({ label, color }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className={`h-2.5 w-2.5 rounded-full ${color}`} />
                  <span className="text-xs text-slate-600">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Parcels */}
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
              Parcels
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded border-2 border-blue-400 bg-blue-400/20" />
              <span className="text-sm text-slate-700">Property boundary</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
