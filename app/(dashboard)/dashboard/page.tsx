import { Suspense } from "react";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { WaterUsageChart } from "@/components/dashboard/water-usage-chart";
import { RecentReadings } from "@/components/dashboard/recent-readings";
import { RecentPosts } from "@/components/dashboard/recent-posts";
import {
  getDashboardStatsFallback,
  getRecentReadingsFallback,
  getDailyUsage,
  getEarliestReadingDate,
} from "@/lib/actions/dashboard";
import { getLogPosts } from "@/lib/actions/log";
import { Skeleton } from "@/components/ui/skeleton";

export default async function DashboardPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<ChartSkeleton />}>
        <ChartSection />
      </Suspense>

      <Suspense fallback={<StatsCardsSkeleton />}>
        <StatsCardsSection />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<RecentReadingsSkeleton />}>
          <RecentReadingsSection />
        </Suspense>
        <Suspense fallback={<RecentPostsSkeleton />}>
          <RecentPostsSection />
        </Suspense>
      </div>
    </div>
  );
}

async function StatsCardsSection() {
  const stats = await getDashboardStatsFallback();

  return (
    <StatsCards
      stats={{
        latestReadingAt: stats.latestReadingAt,
        monthReadings: stats.monthReadings,
        latestChlorine: stats.latestChlorine,
        reservoirLevel: stats.reservoirLevel,
      }}
    />
  );
}

async function ChartSection() {
  // Get the earliest reading date and fetch all available data
  const earliestDate = await getEarliestReadingDate();
  const endDate = new Date().toISOString().split("T")[0];

  const data = await getDailyUsage(earliestDate, endDate);

  // Convert data for the chart
  const chartData = data.map((item) => ({
    date: new Date(item.date).toISOString().split("T")[0],
    total_usage: Number(item.total_usage),
    reading_count: Number(item.reading_count),
  }));

  return (
    <WaterUsageChart
      data={chartData}
      title="Water Production"
      earliestDate={earliestDate}
    />
  );
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

async function RecentPostsSection() {
  const { data } = await getLogPosts({ limit: 5 });
  return <RecentPosts posts={data} />;
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

function RecentPostsSkeleton() {
  return <Skeleton className="h-[380px] rounded-lg" />;
}
