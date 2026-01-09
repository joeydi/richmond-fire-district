"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { insertChlorineReading } from "@/lib/actions/readings";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Location {
  id: string;
  name: string;
  type: string;
}

interface ChlorineFormProps {
  locations: Location[];
}

const SAFE_MIN = 0.2;
const SAFE_MAX = 4.0;

export function ChlorineForm({ locations }: ChlorineFormProps) {
  const [locationId, setLocationId] = useState("");
  const [residualLevel, setResidualLevel] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const level = parseFloat(residualLevel);
  const isOutOfRange = !isNaN(level) && (level < SAFE_MIN || level > SAFE_MAX);
  const isLow = !isNaN(level) && level < SAFE_MIN;
  const isHigh = !isNaN(level) && level > SAFE_MAX;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await insertChlorineReading({
        locationId: locationId || undefined,
        residualLevel: parseFloat(residualLevel),
        recordedAt: new Date().toISOString(),
        notes: notes || undefined,
      });

      if (result.success) {
        toast.success("Reading recorded successfully");
        setResidualLevel("");
        setNotes("");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to record reading");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Record Reading</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="location" className="text-base">
              Location (optional)
            </Label>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger className="h-14 text-lg">
                <SelectValue placeholder="Select a location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="" className="text-lg py-3">
                  No specific location
                </SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id} className="text-lg py-3">
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="level" className="text-base">
              Chlorine Residual (mg/L)
            </Label>
            <Input
              id="level"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              max="10"
              placeholder="0.00"
              value={residualLevel}
              onChange={(e) => setResidualLevel(e.target.value)}
              required
              disabled={loading}
              className={cn(
                "h-16 text-2xl font-mono text-center",
                isOutOfRange && "border-2",
                isLow && "border-amber-500 bg-amber-50",
                isHigh && "border-red-500 bg-red-50"
              )}
            />
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Safe range: {SAFE_MIN} - {SAFE_MAX} mg/L</span>
              {isOutOfRange && (
                <span className={cn(
                  "font-medium",
                  isLow ? "text-amber-600" : "text-red-600"
                )}>
                  {isLow ? "⚠️ Low" : "⚠️ High"}
                </span>
              )}
            </div>
          </div>

          {/* Visual indicator */}
          <div className="space-y-2">
            <div className="h-4 rounded-full bg-gradient-to-r from-amber-400 via-green-400 to-red-400 relative">
              {!isNaN(level) && level >= 0 && level <= 10 && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-6 bg-white border-2 border-slate-700 rounded"
                  style={{ left: `calc(${(level / 10) * 100}% - 8px)` }}
                />
              )}
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>0</span>
              <span>{SAFE_MIN}</span>
              <span>{SAFE_MAX}</span>
              <span>10</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-base">
              Notes (optional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Add any notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
              className="min-h-[100px] text-base"
            />
          </div>

          <Button
            type="submit"
            disabled={loading || !residualLevel}
            className="h-14 w-full text-lg"
          >
            {loading ? "Recording..." : "Record Reading"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
