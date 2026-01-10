"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
}

const infrastructureTypes: InfrastructureType[] = [
  "shutoff_valve",
  "hydrant",
  "well",
  "meter",
  "reservoir",
];

export function LayerControls({
  visibility,
  onVisibilityChange,
}: LayerControlsProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleInfrastructureToggle = (checked: boolean) => {
    onVisibilityChange({
      ...visibility,
      infrastructure: checked,
    });
  };

  const handleParcelsToggle = (checked: boolean) => {
    onVisibilityChange({
      ...visibility,
      parcels: checked,
    });
  };

  const handleTypeToggle = (type: InfrastructureType, checked: boolean) => {
    onVisibilityChange({
      ...visibility,
      infrastructureTypes: {
        ...visibility.infrastructureTypes,
        [type]: checked,
      },
    });
  };

  return (
    <div className="absolute left-4 top-4 z-10 w-56 rounded-lg bg-white shadow-lg">
      <Button
        variant="ghost"
        className="flex w-full items-center justify-between px-3 py-2"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="flex items-center gap-2">
          <Layers className="h-4 w-4" />
          <span className="font-medium">Layers</span>
        </span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </Button>

      {isExpanded && (
        <div className="border-t p-3 space-y-3">
          {/* Infrastructure Layer */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="infrastructure"
                checked={visibility.infrastructure}
                onCheckedChange={handleInfrastructureToggle}
              />
              <Label htmlFor="infrastructure" className="font-medium">
                Infrastructure
              </Label>
            </div>

            {visibility.infrastructure && (
              <div className="ml-6 space-y-1.5">
                {infrastructureTypes.map((type) => (
                  <div key={type} className="flex items-center gap-2">
                    <Checkbox
                      id={type}
                      checked={visibility.infrastructureTypes[type]}
                      onCheckedChange={(checked) =>
                        handleTypeToggle(type, checked === true)
                      }
                    />
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: INFRASTRUCTURE_COLORS[type] }}
                    />
                    <Label htmlFor={type} className="text-sm">
                      {INFRASTRUCTURE_LABELS[type]}
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Parcels Layer */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="parcels"
              checked={visibility.parcels}
              onCheckedChange={handleParcelsToggle}
            />
            <div className="h-3 w-3 rounded border-2 border-blue-400 bg-blue-400/20" />
            <Label htmlFor="parcels" className="font-medium">
              Parcels
            </Label>
          </div>
        </div>
      )}
    </div>
  );
}
