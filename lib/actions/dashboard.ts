"use server";

import { createClient } from "@/lib/supabase/server";

export interface DailyUsage {
  date: string;
  total_usage: number;
  reading_count: number;
}

export interface MonthlyUsage {
  month: number;
  month_name: string;
  total_usage: number;
  reading_count: number;
}

export interface DashboardStat {
  stat_name: string;
  stat_value: number;
  stat_unit: string;
  stat_change: number | null;
}

export interface RecentReading {
  id: string;
  type: string;
  value: number;
  unit: string;
  recorded_at: string;
  location_name: string | null;
}

export async function getDailyUsage(
  startDate: Date,
  endDate: Date
): Promise<DailyUsage[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_daily_usage", {
    start_date: startDate.toISOString().split("T")[0],
    end_date: endDate.toISOString().split("T")[0],
  });

  if (error) {
    console.error("Error fetching daily usage:", error);
    return [];
  }

  return data ?? [];
}

export async function getMonthlyUsage(year: number): Promise<MonthlyUsage[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_monthly_usage", {
    year_param: year,
  });

  if (error) {
    console.error("Error fetching monthly usage:", error);
    return [];
  }

  return data ?? [];
}

export async function getDashboardStats(): Promise<DashboardStat[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_dashboard_stats");

  if (error) {
    console.error("Error fetching dashboard stats:", error);
    return [];
  }

  return data ?? [];
}

export async function getRecentReadings(
  limit: number = 10
): Promise<RecentReading[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_recent_readings", {
    limit_count: limit,
  });

  if (error) {
    console.error("Error fetching recent readings:", error);
    return [];
  }

  return data ?? [];
}

// Fallback queries if RPC functions aren't set up yet
export async function getDashboardStatsFallback() {
  const supabase = await createClient();

  // Get today's readings count
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count: todayCount } = await supabase
    .from("water_production_readings")
    .select("*", { count: "exact", head: true })
    .gte("recorded_at", today.toISOString());

  // Get this month's readings
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const { count: monthCount } = await supabase
    .from("water_production_readings")
    .select("*", { count: "exact", head: true })
    .gte("recorded_at", monthStart.toISOString());

  // Get latest chlorine reading
  const { data: latestChlorine } = await supabase
    .from("chlorine_readings")
    .select("residual_level")
    .order("recorded_at", { ascending: false })
    .limit(1)
    .single();

  // Get reservoir count
  const { count: reservoirCount } = await supabase
    .from("reservoirs")
    .select("*", { count: "exact", head: true });

  return {
    todayReadings: todayCount ?? 0,
    monthReadings: monthCount ?? 0,
    latestChlorine: latestChlorine?.residual_level ?? null,
    reservoirCount: reservoirCount ?? 0,
  };
}

export async function getRecentReadingsFallback(limit: number = 5) {
  const supabase = await createClient();

  const { data: waterReadings } = await supabase
    .from("water_production_readings")
    .select(`
      id,
      reading_value,
      recorded_at,
      meters (name)
    `)
    .order("recorded_at", { ascending: false })
    .limit(limit);

  const { data: chlorineReadings } = await supabase
    .from("chlorine_readings")
    .select(`
      id,
      residual_level,
      recorded_at,
      infrastructure_points (name)
    `)
    .order("recorded_at", { ascending: false })
    .limit(limit);

  const { data: reservoirReadings } = await supabase
    .from("reservoir_readings")
    .select(`
      id,
      level_inches,
      level_percent,
      recorded_at,
      reservoirs (name)
    `)
    .order("recorded_at", { ascending: false })
    .limit(limit);

  return {
    waterReadings: waterReadings ?? [],
    chlorineReadings: chlorineReadings ?? [],
    reservoirReadings: reservoirReadings ?? [],
  };
}
