import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface Reading {
  id: string;
  type: string;
  value: number;
  unit: string;
  recorded_at: string;
  location_name: string | null;
}

interface RecentReadingsProps {
  readings: Reading[];
}

const typeLabels: Record<string, string> = {
  water_production: "Water",
  chlorine: "Chlorine",
  reservoir: "Reservoir",
};

const typeBadgeVariant: Record<string, "default" | "secondary" | "outline"> = {
  water_production: "default",
  chlorine: "secondary",
  reservoir: "outline",
};

export function RecentReadings({ readings }: RecentReadingsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium">Recent Readings</CardTitle>
      </CardHeader>
      <CardContent>
        {readings.length === 0 ? (
          <p className="text-center text-sm text-slate-500 py-8">
            No readings recorded yet
          </p>
        ) : (
          <div className="space-y-3">
            {readings.map((reading) => (
              <div
                key={reading.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <Badge variant={typeBadgeVariant[reading.type] ?? "default"}>
                    {typeLabels[reading.type] ?? reading.type}
                  </Badge>
                  <div>
                    <p className="font-medium">
                      {reading.value.toLocaleString()} {reading.unit}
                    </p>
                    {reading.location_name && (
                      <p className="text-xs text-slate-500">
                        {reading.location_name}
                      </p>
                    )}
                  </div>
                </div>
                <span className="text-xs text-slate-500">
                  {formatDistanceToNow(new Date(reading.recorded_at), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
