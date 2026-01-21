"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown } from "lucide-react";
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

interface Reservoir {
  id: string;
  name: string;
  max_level_inches: number | null;
}

interface ReservoirFormProps {
  reservoirs: Reservoir[];
  lastReadings: Record<string, number | null>;
}

export function ReservoirForm({ reservoirs, lastReadings }: ReservoirFormProps) {
  const [reservoirId, setReservoirId] = useState(reservoirs[0].id ?? '');
  const initialReading = lastReadings[reservoirs[0]?.id];
  const [levelInches, setLevelInches] = useState(
    initialReading != null ? initialReading.toString() : ""
  );
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const selectedReservoir = useMemo(
    () => reservoirs.find((r) => r.id === reservoirId),
    [reservoirs, reservoirId]
  );

  const level = parseFloat(levelInches);
  const maxLevel = selectedReservoir?.max_level_inches ?? 0;
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
        levelInches: parseFloat(levelInches),
        levelPercent: maxLevel ? percentage : undefined,
        recordedAt: new Date().toISOString(),
        notes: notes || undefined,
      });

      if (result.success) {
        toast.success("Reading recorded successfully");
        setLevelInches("");
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
        <CardTitle>Reservoir Reading</CardTitle>
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
                    {reservoir.max_level_inches && (
                      <span className="text-slate-500 ml-2">
                        (max {reservoir.max_level_inches} in)
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="level" className="text-base">
              Water Level (inches)
            </Label>
            <Input
              id="level"
              type="number"
              inputMode="decimal"
              step="1"
              min="0"
              max={maxLevel}
              placeholder="0.0"
              value={levelInches}
              onChange={(e) => setLevelInches(e.target.value)}
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

          <Collapsible>
            <CollapsibleTrigger className="flex w-full items-center justify-between text-base font-medium text-slate-700">
              Notes (optional)
              <ChevronDown className="h-4 w-4 transition-transform [[data-state=open]>svg]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <Textarea
                id="notes"
                placeholder="Add any notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={loading}
                className="min-h-[100px] text-base"
              />
            </CollapsibleContent>
          </Collapsible>

          <Button
            type="submit"
            disabled={loading || !reservoirId || !levelInches}
            className="h-14 w-full text-lg"
          >
            {loading ? "Recording..." : "Record Reading"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
