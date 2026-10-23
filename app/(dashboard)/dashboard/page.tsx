import { cache, Suspense } from "react";
import { KpiBand } from "@/components/dashboard/kpi-band";
import { WaterUsageChart } from "@/components/dashboard/water-usage-chart";
import { RecentReadings, type DashboardReading } from "@/components/dashboard/recent-readings";
import { RecentPosts } from "@/components/dashboard/recent-posts";
import {
  getDashboardStatsFallback,
  getRecentReadingsFallback,
  getDailyUsage,
  getEarliestReadingDate,
} from "@/lib/actions/dashboard";
import { getLogPosts } from "@/lib/actions/log";
import { calculateDailyRate } from "@/lib/usage";
import { Skeleton } from "@/components/ui/skeleton";

const RECENT_READINGS = 6;

// Shared by the KPI band and the chart so each is fetched once per request
const getStats = cache(getDashboardStatsFallback);
const getRequestTime = cache(() => Date.now());
const getUsage = cache(async () => {
  const earliestDate = await getEarliestReadingDate();
  const endDate = new Date().toISOString().split("T")[0];
  const data = await getDailyUsage(earliestDate, endDate);
  return {
    earliestDate,
    data: data.map((item) => ({
      date: new Date(item.date).toISOString().split("T")[0],
      total_usage: Number(item.total_usage),
      reading_count: Number(item.reading_count),
    })),
  };
});

export default async function DashboardPage() {
  return (
    <div data-flush className="flex min-h-full flex-col">
      <Suspense fallback={<KpiSkeleton />}>
        <KpiSection />
      </Suspense>

      <Suspense fallback={<ChartSkeleton />}>
        <ChartSection />
      </Suspense>

      <div className="flex flex-wrap">
        <div className="min-w-0 flex-[2_1_520px] lg:border-r">
          <Suspense fallback={<ListSkeleton />}>
            <RecentReadingsSection />
          </Suspense>
        </div>
        <div className="min-w-0 flex-[1_1_320px]">
          <Suspense fallback={<ListSkeleton />}>
            <RecentPostsSection />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

async function KpiSection() {
  const [stats, usage] = await Promise.all([getStats(), getUsage()]);
  return <KpiBand stats={stats} rates={calculateDailyRate(usage.data)} now={getRequestTime()} />;
}

async function ChartSection() {
  const [stats, usage] = await Promise.all([getStats(), getUsage()]);
  return (
    <WaterUsageChart
      data={usage.data}
      title="Water production"
      meterName={stats.latestProductionMeter}
      earliestDate={usage.earliestDate}
    />
  );
}

async function RecentReadingsSection() {
  const data = await getRecentReadingsFallback(RECENT_READINGS);

  // Gallons since the previous reading of the same meter (readings are newest first)
  const meterReadings = data.waterReadings as unknown as {
    id: string;
    meter_id: string;
    reading_value: number;
    production_rate: number | null;
    interpolated: boolean | null;
    recorded_at: string;
    meters: { name: string } | null;
  }[];
  const meterRows: DashboardReading[] = meterReadings.map((r, i) => {
    const previous = meterReadings.slice(i + 1).find((p) => p.meter_id === r.meter_id);
    return {
      id: r.id,
      type: "meter",
      value: r.reading_value,
      unit: "gal",
      recorded_at: r.recorded_at,
      location_name: r.meters?.name ?? null,
      delta: previous ? r.reading_value - previous.reading_value : null,
      production_rate: r.production_rate,
      interpolated: Boolean(r.interpolated),
    };
  });

  const allReadings: DashboardReading[] = [
    ...meterRows,
    ...(data.chlorineReadings as unknown as {
      id: string;
      residual_level: number;
      interpolated: boolean | null;
      recorded_at: string;
      infrastructure_points: { name: string } | null;
    }[]).map((r) => ({
      id: r.id,
      type: "chlorine" as const,
      value: r.residual_level,
      unit: "mg/L",
      recorded_at: r.recorded_at,
      location_name: r.infrastructure_points?.name ?? null,
      interpolated: Boolean(r.interpolated),
    })),
    ...(data.reservoirReadings as unknown as {
      id: string;
      level_inches: number;
      recorded_at: string;
      reservoirs: { name: string } | null;
    }[]).map((r) => ({
      id: r.id,
      type: "reservoir" as const,
      value: r.level_inches,
      unit: "in",
      recorded_at: r.recorded_at,
      location_name: r.reservoirs?.name ?? null,
    })),
  ]
    .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())
    .slice(0, RECENT_READINGS);

  return <RecentReadings readings={allReadings} />;
}

async function RecentPostsSection() {
  const { data } = await getLogPosts({ limit: 6 });
  return <RecentPosts posts={data} />;
}

function KpiSkeleton() {
  return <Skeleton className="h-[106px] rounded-none border-b" />;
}

function ChartSkeleton() {
  return <Skeleton className="h-[380px] rounded-none border-b" />;
}

function ListSkeleton() {
  return <Skeleton className="m-4 h-[220px]" />;
}
