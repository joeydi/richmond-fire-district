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
import { insertWaterProductionReading } from "@/lib/actions/readings";
import { toast } from "sonner";

interface Meter {
  id: string;
  name: string;
}

interface WaterProductionFormProps {
  meters: Meter[];
}

export function WaterProductionForm({ meters }: WaterProductionFormProps) {
  const [meterId, setMeterId] = useState("");
  const [readingValue, setReadingValue] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await insertWaterProductionReading({
        meterId,
        readingValue: parseFloat(readingValue),
        recordedAt: new Date().toISOString(),
        notes: notes || undefined,
      });

      if (result.success) {
        toast.success("Reading recorded successfully");
        setReadingValue("");
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
            <Label htmlFor="meter" className="text-base">
              Meter
            </Label>
            <Select value={meterId} onValueChange={setMeterId} required>
              <SelectTrigger className="h-14 text-lg">
                <SelectValue placeholder="Select a meter" />
              </SelectTrigger>
              <SelectContent>
                {meters.map((meter) => (
                  <SelectItem key={meter.id} value={meter.id} className="text-lg py-3">
                    {meter.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reading" className="text-base">
              Reading Value (gallons)
            </Label>
            <Input
              id="reading"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={readingValue}
              onChange={(e) => setReadingValue(e.target.value)}
              required
              disabled={loading}
              className="h-16 text-2xl font-mono text-center"
            />
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
            disabled={loading || !meterId || !readingValue}
            className="h-14 w-full text-lg"
          >
            {loading ? "Recording..." : "Record Reading"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
