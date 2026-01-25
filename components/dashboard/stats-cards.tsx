import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Droplets, FlaskConical, Waves, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNowStrict } from "date-fns";

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  description?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  status?: "normal" | "warning" | "critical";
}

function StatCard({
  title,
  value,
  unit,
  icon,
  description,
  status = "normal",
}: StatCardProps) {
  return (
    <Card
      className={cn(
        status === "warning" && "border-amber-200 bg-amber-50",
        status === "critical" && "border-red-200 bg-red-50"
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-slate-600">
          {title}
        </CardTitle>
        <div
          className={cn(
            "rounded-full p-2",
            status === "normal" && "bg-blue-100 text-blue-600",
            status === "warning" && "bg-amber-100 text-amber-600",
            status === "critical" && "bg-red-100 text-red-600"
          )}
        >
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold">{value}</span>
          {unit && <span className="text-sm text-slate-500">{unit}</span>}
        </div>
        {description && (
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

interface StatsCardsProps {
  stats: {
    latestReadingAt: string | null;
    latestProductionRate: number | null;
    latestProductionMeter: string | null;
    latestChlorine: number | null;
    reservoirLevel: number | null;
  };
}

export function StatsCards({ stats }: StatsCardsProps) {
  const chlorineStatus = getChlorineStatus(stats.latestChlorine);
  const reservoirStatus = getReservoirStatus(stats.reservoirLevel);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Latest Reading"
        value={
          stats.latestReadingAt
            ? formatDistanceToNowStrict(new Date(stats.latestReadingAt), {
                addSuffix: true,
              })
            : "—"
        }
        icon={<Clock className="h-4 w-4" />}
        description="Time since last reading"
      />
      <StatCard
        title="Production Rate"
        value={stats.latestProductionRate?.toLocaleString() ?? "—"}
        unit="gal/day"
        icon={<Droplets className="h-4 w-4" />}
        description={stats.latestProductionMeter ?? "No recent readings"}
      />
      <StatCard
        title="Chlorine Level"
        value={stats.latestChlorine?.toFixed(2) ?? "—"}
        unit="mg/L"
        icon={<FlaskConical className="h-4 w-4" />}
        description={chlorineStatus.description}
        status={chlorineStatus.status}
      />
      <StatCard
        title="Reservoir Level"
        value={stats.reservoirLevel?.toFixed(0) ?? "—"}
        unit="in"
        icon={<Waves className="h-4 w-4" />}
        description={reservoirStatus.description}
        status={reservoirStatus.status}
      />
    </div>
  );
}

function getChlorineStatus(level: number | null): {
  status: "normal" | "warning" | "critical";
  description: string;
} {
  if (level === null) {
    return { status: "normal", description: "No recent readings" };
  }
  if (level < 0.2) {
    return { status: "critical", description: "Below safe level" };
  }
  if (level > 4.0) {
    return { status: "warning", description: "Above recommended level" };
  }
  return { status: "normal", description: "Within safe range" };
}

function getReservoirStatus(level: number | null): {
  status: "normal" | "warning" | "critical";
  description: string;
} {
  if (level === null) {
    return { status: "normal", description: "No recent readings" };
  }
  if (level < 25) {
    return { status: "critical", description: "Critically low" };
  }
  if (level < 50) {
    return { status: "warning", description: "Below 50 inches" };
  }
  return { status: "normal", description: "Adequate level" };
}
