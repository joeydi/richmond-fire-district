"use server";

import { createClient } from "@/lib/supabase/server";
import { requireEditor } from "@/lib/auth/roles";
import { revalidatePath } from "next/cache";
import { format, parseISO, startOfMonth, endOfMonth, addMonths } from "date-fns";
import {
  interpolateMissingDays,
  getDaysInMonth,
  type ReadingPoint,
} from "@/lib/utils/interpolation";

// Types
export interface ReportDayData {
  date: string; // YYYY-MM-DD
  meterAverage: number | null;
  dailyUsage: number | null;
  chlorineAverage: number | null;
  isMeterInterpolated: boolean;
  isDailyUsageInterpolated: boolean;
  isChlorineInterpolated: boolean;
}

export interface MonthlyReportData {
  month: string;
  days: ReportDayData[];
  meters: { id: string; name: string }[];
  availableMonths: string[];
  carryTotal: number | null; // Last meter reading from previous month
}

interface GetMonthlyReportParams {
  month: string; // YYYY-MM format
  meterId: string;
}

/**
 * Get all months that have any readings data
 */
export async function getAvailableReportMonths(): Promise<string[]> {
  const supabase = await createClient();

  // Get distinct months from meter readings
  const { data: meterMonths } = await supabase
    .from("meter_readings")
    .select("recorded_at")
    .order("recorded_at", { ascending: false });

  // Get distinct months from chlorine readings
  const { data: chlorineMonths } = await supabase
    .from("chlorine_readings")
    .select("recorded_at")
    .order("recorded_at", { ascending: false });

  // Extract unique months
  const monthsSet = new Set<string>();

  meterMonths?.forEach((r) => {
    const month = format(parseISO(r.recorded_at), "yyyy-MM");
    monthsSet.add(month);
  });

  chlorineMonths?.forEach((r) => {
    const month = format(parseISO(r.recorded_at), "yyyy-MM");
    monthsSet.add(month);
  });

  // Sort descending (most recent first)
  return Array.from(monthsSet).sort().reverse();
}

/**
 * Get all meters
 */
export async function getReportMeters(): Promise<
  { id: string; name: string }[]
> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("meters")
    .select("id, name")
    .order("name");

  return data ?? [];
}

/**
 * Get monthly report data with interpolation for missing days
 */
export async function getMonthlyReportData(
  params: GetMonthlyReportParams
): Promise<MonthlyReportData> {
  const { month, meterId } = params;
  const supabase = await createClient();

  // Calculate date range for the month
  const monthStart = startOfMonth(parseISO(`${month}-01`));
  const nextMonth = format(addMonths(monthStart, 1), "yyyy-MM");
  const prevMonth = format(addMonths(monthStart, -1), "yyyy-MM");

  // Fetch meter readings for the month (filtered by meterId)
  const { data: meterReadings } = await supabase
    .from("meter_readings")
    .select("id, reading_value, recorded_at, meter_id")
    .gte("recorded_at", `${month}-01T00:00:00`)
    .lt("recorded_at", `${nextMonth}-01T00:00:00`)
    .eq("meter_id", meterId)
    .order("recorded_at");

  // Fetch all chlorine readings for the month (no location filter)
  const { data: chlorineReadings } = await supabase
    .from("chlorine_readings")
    .select("id, residual_level, recorded_at")
    .gte("recorded_at", `${month}-01T00:00:00`)
    .lt("recorded_at", `${nextMonth}-01T00:00:00`)
    .order("recorded_at");

  // Fetch previous month's meter readings to calculate carry total with same interpolation logic
  const { data: prevMeterReadings } = await supabase
    .from("meter_readings")
    .select("id, reading_value, recorded_at")
    .eq("meter_id", meterId)
    .gte("recorded_at", `${prevMonth}-01T00:00:00`)
    .lt("recorded_at", `${month}-01T00:00:00`)
    .order("recorded_at");

  // Calculate carry total using same interpolation logic as report table
  let carryTotal: number | null = null;
  if (prevMeterReadings && prevMeterReadings.length > 0) {
    // Group previous month readings by date and calculate daily averages
    const prevMeterByDate = new Map<string, number[]>();
    prevMeterReadings.forEach((r) => {
      const date = format(parseISO(r.recorded_at), "yyyy-MM-dd");
      if (!prevMeterByDate.has(date)) {
        prevMeterByDate.set(date, []);
      }
      prevMeterByDate.get(date)!.push(r.reading_value);
    });

    const prevMeterAverages: ReadingPoint[] = [];
    prevMeterByDate.forEach((values, date) => {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      prevMeterAverages.push({ date, value: avg });
    });

    // Get all days in previous month and interpolate
    const prevMonthDates = getDaysInMonth(prevMonth);
    const interpolatedPrevMeter = interpolateMissingDays(
      prevMeterAverages,
      prevMonthDates,
      true // Add variation for meter readings
    );

    // Get the last day's value
    const lastDayData = interpolatedPrevMeter[interpolatedPrevMeter.length - 1];
    if (lastDayData) {
      carryTotal = Math.round(lastDayData.value);
    }
  }

  // Group readings by date and calculate daily averages
  const meterByDate = new Map<string, number[]>();
  meterReadings?.forEach((r) => {
    const date = format(parseISO(r.recorded_at), "yyyy-MM-dd");
    if (!meterByDate.has(date)) {
      meterByDate.set(date, []);
    }
    meterByDate.get(date)!.push(r.reading_value);
  });

  const chlorineByDate = new Map<string, number[]>();
  chlorineReadings?.forEach((r) => {
    const date = format(parseISO(r.recorded_at), "yyyy-MM-dd");
    if (!chlorineByDate.has(date)) {
      chlorineByDate.set(date, []);
    }
    chlorineByDate.get(date)!.push(r.residual_level);
  });

  // Calculate averages for dates with readings
  const meterAverages: ReadingPoint[] = [];
  meterByDate.forEach((values, date) => {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    meterAverages.push({ date, value: avg });
  });

  const chlorineAverages: ReadingPoint[] = [];
  chlorineByDate.forEach((values, date) => {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    chlorineAverages.push({ date, value: avg });
  });

  // Get all days in the month
  const allDates = getDaysInMonth(month);

  // Interpolate missing days
  const interpolatedMeter = interpolateMissingDays(
    meterAverages,
    allDates,
    true // Add variation for meter readings
  );
  const interpolatedChlorine = interpolateMissingDays(
    chlorineAverages,
    allDates,
    false // No variation for chlorine
  );

  // Check if we have any data at all for each type
  const hasMeterData = meterAverages.length > 0;
  const hasChlorineData = chlorineAverages.length > 0;

  // Get today's date for comparison (no estimations for future dates)
  const today = format(new Date(), "yyyy-MM-dd");

  // Build the days array with daily usage calculation
  const days: ReportDayData[] = allDates.map((date, index) => {
    const meterData = interpolatedMeter[index];
    const chlorineData = interpolatedChlorine[index];
    const isFutureDate = date > today;

    // For future dates, only show actual data (not interpolated)
    const showMeterData = hasMeterData && (!isFutureDate || !meterData.isInterpolated);
    const showChlorineData = hasChlorineData && (!isFutureDate || !chlorineData.isInterpolated);

    // Calculate daily usage (difference from previous day or carry total)
    let dailyUsage: number | null = null;
    let isDailyUsageInterpolated = false;

    if (showMeterData) {
      if (index === 0) {
        // First day: use carry total from previous month
        if (carryTotal !== null) {
          dailyUsage = Math.round(meterData.value) - carryTotal;
          // First day usage is interpolated if current reading is interpolated
          // (carry total itself may be interpolated, but we treat it as the baseline)
          isDailyUsageInterpolated = meterData.isInterpolated;
        }
      } else {
        // Other days: use previous day's reading
        const prevMeterData = interpolatedMeter[index - 1];
        const prevDate = allDates[index - 1];
        const prevIsFutureDate = prevDate > today;
        const showPrevMeterData = hasMeterData && (!prevIsFutureDate || !prevMeterData.isInterpolated);

        if (showPrevMeterData) {
          dailyUsage = Math.round(meterData.value - prevMeterData.value);
          isDailyUsageInterpolated = meterData.isInterpolated || prevMeterData.isInterpolated;
        }
      }
    }

    return {
      date,
      meterAverage: showMeterData ? Math.round(meterData.value) : null,
      dailyUsage,
      chlorineAverage: showChlorineData
        ? Math.round(chlorineData.value * 100) / 100
        : null,
      isMeterInterpolated: showMeterData ? meterData.isInterpolated : false,
      isDailyUsageInterpolated,
      isChlorineInterpolated: showChlorineData
        ? chlorineData.isInterpolated
        : false,
    };
  });

  // Fetch supporting data
  const [meters, availableMonths] = await Promise.all([
    getReportMeters(),
    getAvailableReportMonths(),
  ]);

  return {
    month,
    days,
    meters,
    availableMonths,
    carryTotal,
  };
}

/**
 * Accept an interpolated meter reading by creating a real reading
 */
export async function acceptInterpolatedMeterReading(input: {
  date: string;
  meterId: string;
  value: number;
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireEditor();

  const supabase = await createClient();

  // Create reading at noon on the given date
  const recordedAt = `${input.date}T12:00:00.000Z`;

  const { error } = await supabase.from("meter_readings").insert({
    meter_id: input.meterId,
    reading_value: input.value,
    recorded_at: recordedAt,
    notes: "Auto-accepted from report interpolation",
    created_by: user.id,
  });

  if (error) {
    console.error("Error accepting meter reading:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/reports");
  return { success: true };
}

/**
 * Accept an interpolated chlorine reading by creating a real reading
 */
export async function acceptInterpolatedChlorineReading(input: {
  date: string;
  value: number;
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireEditor();

  const supabase = await createClient();

  // Create reading at noon on the given date
  const recordedAt = `${input.date}T12:00:00.000Z`;

  const { error } = await supabase.from("chlorine_readings").insert({
    location_id: null,
    residual_level: input.value,
    recorded_at: recordedAt,
    notes: "Auto-accepted from report interpolation",
    created_by: user.id,
  });

  if (error) {
    console.error("Error accepting chlorine reading:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/reports");
  return { success: true };
}
