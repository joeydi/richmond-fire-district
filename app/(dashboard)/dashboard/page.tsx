import { Suspense } from "react";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { WaterUsageChart } from "@/components/dashboard/water-usage-chart";
import { RecentReadings } from "@/components/dashboard/recent-readings";
import {
  getDashboardStatsFallback,
  getRecentReadingsFallback,
  getDailyUsage,
} from "@/lib/actions/dashboard";
import { Skeleton } from "@/components/ui/skeleton";

export default async function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">
          Water system overview and recent activity
        </p>
      </div>

      <Suspense fallback={<StatsCardsSkeleton />}>
        <StatsCardsSection />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Suspense fallback={<ChartSkeleton />}>
            <ChartSection />
          </Suspense>
        </div>
        <div>
          <Suspense fallback={<RecentReadingsSkeleton />}>
            <RecentReadingsSection />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

async function StatsCardsSection() {
  const stats = await getDashboardStatsFallback();

  return (
    <StatsCards
      stats={{
        todayReadings: stats.todayReadings,
        monthReadings: stats.monthReadings,
        latestChlorine: stats.latestChlorine,
        reservoirLevel: null, // Will be populated when reservoir readings exist
      }}
    />
  );
}

async function ChartSection() {
  // Get daily usage data for the last 30 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const data = await getDailyUsage(startDate, endDate);

  // Convert data for the chart
  const chartData = data.map((item) => ({
    date: new Date(item.date).toISOString().split("T")[0],
    total_usage: Number(item.total_usage),
    reading_count: Number(item.reading_count),
  }));

  return <WaterUsageChart data={chartData} title="Water Production" />;
}

async function RecentReadingsSection() {
  const data = await getRecentReadingsFallback(5);

  // Combine and sort all readings
  const allReadings = [
    ...data.waterReadings.map((r: any) => ({
      id: r.id,
      type: "meter",
      value: r.reading_value,
      unit: "gal",
      recorded_at: r.recorded_at,
      location_name: r.meters?.name ?? null,
    })),
    ...data.chlorineReadings.map((r: any) => ({
      id: r.id,
      type: "chlorine",
      value: r.residual_level,
      unit: "mg/L",
      recorded_at: r.recorded_at,
      location_name: r.infrastructure_points?.name ?? null,
    })),
    ...data.reservoirReadings.map((r: any) => ({
      id: r.id,
      type: "reservoir",
      value: r.level_inches,
      unit: "in",
      recorded_at: r.recorded_at,
      location_name: r.reservoirs?.name ?? null,
    })),
  ]
    .sort(
      (a, b) =>
        new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
    )
    .slice(0, 5);

  return <RecentReadings readings={allReadings} />;
}

function StatsCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-[120px] rounded-lg" />
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return <Skeleton className="h-[380px] rounded-lg" />;
}

function RecentReadingsSkeleton() {
  return <Skeleton className="h-[380px] rounded-lg" />;
}
