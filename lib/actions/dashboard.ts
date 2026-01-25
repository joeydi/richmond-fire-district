"use server";

import { createClient } from "@/lib/supabase/server";
import { format, parseISO } from "date-fns";

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
  startDate: Date | string,
  endDate: Date | string
): Promise<DailyUsage[]> {
  const supabase = await createClient();

  // Convert to ISO date string format (YYYY-MM-DD)
  const startStr =
    typeof startDate === "string"
      ? startDate
      : startDate.toISOString().split("T")[0];
  const endStr =
    typeof endDate === "string"
      ? endDate
      : endDate.toISOString().split("T")[0];

  const { data, error } = await supabase
    .rpc("get_daily_usage", {
      start_date: startStr,
      end_date: endStr,
    })
    .limit(10000); // Override Supabase's default 1000 row limit

  if (error) {
    console.error("Error fetching daily usage:", error);
    return [];
  }

  return data ?? [];
}

export async function getEarliestReadingDate(): Promise<string> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("meter_readings")
    .select("recorded_at")
    .order("recorded_at", { ascending: true })
    .limit(1);

  if (!error && data && data.length > 0 && data[0].recorded_at) {
    // Return ISO date string (YYYY-MM-DD) for reliable serialization
    return new Date(data[0].recorded_at).toISOString().split("T")[0];
  }

  // Fallback to 1 year ago if no readings found or query fails
  const fallback = new Date();
  fallback.setFullYear(fallback.getFullYear() - 1);
  return fallback.toISOString().split("T")[0];
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

  // Get latest reading timestamp (from any reading type)
  const { data: latestMeter } = await supabase
    .from("meter_readings")
    .select("recorded_at")
    .order("recorded_at", { ascending: false })
    .limit(1)
    .single();

  const { data: latestChlorineReading } = await supabase
    .from("chlorine_readings")
    .select("recorded_at")
    .order("recorded_at", { ascending: false })
    .limit(1)
    .single();

  const { data: latestReservoir } = await supabase
    .from("reservoir_readings")
    .select("recorded_at, level_inches")
    .order("recorded_at", { ascending: false })
    .limit(1)
    .single();

  // Find the most recent reading across all types
  const timestamps = [
    latestMeter?.recorded_at,
    latestChlorineReading?.recorded_at,
    latestReservoir?.recorded_at,
  ].filter(Boolean) as string[];

  const latestReadingAt =
    timestamps.length > 0
      ? timestamps.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
      : null;

  // Get the most recent meter reading to identify which meter to use
  const { data: mostRecentReading } = await supabase
    .from("meter_readings")
    .select("meter_id, meters (name)")
    .order("recorded_at", { ascending: false })
    .limit(1)
    .single();

  // Calculate production rate as difference between daily averages for that meter
  let latestProductionRate: number | null = null;
  let latestProductionMeter: string | null = null;

  if (mostRecentReading?.meter_id) {
    latestProductionMeter = (mostRecentReading.meters as unknown as { name: string } | null)?.name ?? null;

    // Get recent readings for this specific meter
    const { data: meterReadings } = await supabase
      .from("meter_readings")
      .select("reading_value, recorded_at")
      .eq("meter_id", mostRecentReading.meter_id)
      .order("recorded_at", { ascending: false })
      .limit(50);

    if (meterReadings && meterReadings.length > 0) {
      // Group readings by date and calculate daily averages
      const readingsByDate = new Map<string, number[]>();

      meterReadings.forEach((r) => {
        const date = format(parseISO(r.recorded_at), "yyyy-MM-dd");
        if (!readingsByDate.has(date)) {
          readingsByDate.set(date, []);
        }
        readingsByDate.get(date)!.push(r.reading_value);
      });

      // Sort dates descending and get the two most recent
      const sortedDates = Array.from(readingsByDate.keys()).sort().reverse();

      if (sortedDates.length >= 2) {
        const latestDate = sortedDates[0];
        const previousDate = sortedDates[1];

        const latestValues = readingsByDate.get(latestDate)!;
        const previousValues = readingsByDate.get(previousDate)!;

        // Calculate averages
        const latestAvg = latestValues.reduce((a, b) => a + b, 0) / latestValues.length;
        const previousAvg = previousValues.reduce((a, b) => a + b, 0) / previousValues.length;

        latestProductionRate = Math.round(latestAvg - previousAvg);
      }
    }
  }

  // Get latest chlorine reading
  const { data: latestChlorine } = await supabase
    .from("chlorine_readings")
    .select("residual_level")
    .order("recorded_at", { ascending: false })
    .limit(1)
    .single();

  return {
    latestReadingAt,
    latestProductionRate,
    latestProductionMeter,
    latestChlorine: latestChlorine?.residual_level ?? null,
    reservoirLevel: latestReservoir?.level_inches ?? null,
  };
}

export async function getRecentReadingsFallback(limit: number = 5) {
  const supabase = await createClient();

  const { data: waterReadings } = await supabase
    .from("meter_readings")
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
