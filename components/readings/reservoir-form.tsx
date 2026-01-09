"use client";

import { useState, useMemo } from "react";
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
import { insertReservoirReading } from "@/lib/actions/readings";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Reservoir {
  id: string;
  name: string;
  max_level_feet: number | null;
}

interface ReservoirFormProps {
  reservoirs: Reservoir[];
}

export function ReservoirForm({ reservoirs }: ReservoirFormProps) {
  const [reservoirId, setReservoirId] = useState("");
  const [levelFeet, setLevelFeet] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const selectedReservoir = useMemo(
    () => reservoirs.find((r) => r.id === reservoirId),
    [reservoirs, reservoirId]
  );

  const level = parseFloat(levelFeet);
  const maxLevel = selectedReservoir?.max_level_feet ?? 0;
  const percentage = useMemo(() => {
    if (isNaN(level) || !maxLevel) return 0;
    return Math.min(Math.max((level / maxLevel) * 100, 0), 100);
  }, [level, maxLevel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await insertReservoirReading({
        reservoirId,
        levelFeet: parseFloat(levelFeet),
        levelPercent: maxLevel ? percentage : undefined,
        recordedAt: new Date().toISOString(),
        notes: notes || undefined,
      });

      if (result.success) {
        toast.success("Reading recorded successfully");
        setLevelFeet("");
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

  const gaugeColor = useMemo(() => {
    if (percentage >= 75) return "bg-blue-500";
    if (percentage >= 50) return "bg-blue-400";
    if (percentage >= 25) return "bg-amber-400";
    return "bg-red-400";
  }, [percentage]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Record Reading</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="reservoir" className="text-base">
              Reservoir
            </Label>
            <Select value={reservoirId} onValueChange={setReservoirId} required>
              <SelectTrigger className="h-14 text-lg">
                <SelectValue placeholder="Select a reservoir" />
              </SelectTrigger>
              <SelectContent>
                {reservoirs.map((reservoir) => (
                  <SelectItem key={reservoir.id} value={reservoir.id} className="text-lg py-3">
                    {reservoir.name}
                    {reservoir.max_level_feet && (
                      <span className="text-slate-500 ml-2">
                        (max {reservoir.max_level_feet} ft)
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="level" className="text-base">
              Water Level (feet)
            </Label>
            <Input
              id="level"
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              placeholder="0.0"
              value={levelFeet}
              onChange={(e) => setLevelFeet(e.target.value)}
              required
              disabled={loading}
              className="h-16 text-2xl font-mono text-center"
            />
            {maxLevel > 0 && !isNaN(level) && (
              <p className="text-center text-sm text-slate-600">
                {percentage.toFixed(1)}% of capacity
              </p>
            )}
          </div>

          {/* Visual gauge */}
          {reservoirId && (
            <div className="space-y-2">
              <div className="relative h-48 w-full rounded-lg border-2 border-slate-300 bg-slate-100 overflow-hidden">
                {/* Water level */}
                <div
                  className={cn(
                    "absolute bottom-0 left-0 right-0 transition-all duration-300",
                    gaugeColor
                  )}
                  style={{ height: `${percentage}%` }}
                >
                  {/* Wave effect */}
                  <div className="absolute inset-x-0 -top-2 h-4 bg-gradient-to-b from-white/30 to-transparent" />
                </div>

                {/* Level markers */}
                <div className="absolute inset-y-0 right-2 flex flex-col justify-between py-2 text-xs text-slate-500">
                  <span>100%</span>
                  <span>75%</span>
                  <span>50%</span>
                  <span>25%</span>
                  <span>0%</span>
                </div>

                {/* Current reading display */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="rounded-lg bg-white/90 px-4 py-2 text-center shadow">
                    <p className="text-3xl font-bold text-slate-900">
                      {!isNaN(level) ? level.toFixed(1) : "—"}
                    </p>
                    <p className="text-sm text-slate-600">feet</p>
                  </div>
                </div>
              </div>
            </div>
          )}

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
            disabled={loading || !reservoirId || !levelFeet}
            className="h-14 w-full text-lg"
          >
            {loading ? "Recording..." : "Record Reading"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
