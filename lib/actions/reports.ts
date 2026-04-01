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
import { getDailyUsage } from "@/lib/actions/dashboard";

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
  const nextNextMonth = format(addMonths(monthStart, 2), "yyyy-MM");
  const prevMonth = format(addMonths(monthStart, -1), "yyyy-MM");

  // Fetch meter readings via RPC (already grouped and averaged by day)
  const meterReadingsData = await getDailyUsage(
    `${month}-01`,
    `${nextMonth}-01`,
    meterId
  );

  // Fetch all chlorine readings for the month (no location filter)
  const { data: chlorineReadings } = await supabase
    .from("chlorine_readings")
    .select("id, residual_level, recorded_at")
    .gte("recorded_at", `${month}-01T00:00:00`)
    .lt("recorded_at", `${nextMonth}-01T00:00:00`)
    .order("recorded_at");

  // Fetch next month's first meter reading as forward anchor for interpolation
  const nextMeterReadingsData = await getDailyUsage(
    `${nextMonth}-01`,
    `${nextNextMonth}-01`,
    meterId
  );
  const nextMeterAnchor: ReadingPoint | null =
    nextMeterReadingsData.length > 0
      ? { date: nextMeterReadingsData[0].date, value: nextMeterReadingsData[0].total_usage }
      : null;

  // Fetch next month's first chlorine reading as forward anchor for interpolation
  const { data: nextChlorineReadings } = await supabase
    .from("chlorine_readings")
    .select("residual_level, recorded_at")
    .gte("recorded_at", `${nextMonth}-01T00:00:00`)
    .order("recorded_at", { ascending: true })
    .limit(10);

  let nextChlorineAnchor: ReadingPoint | null = null;
  if (nextChlorineReadings && nextChlorineReadings.length > 0) {
    // Group by the earliest date and average
    const firstDate = format(parseISO(nextChlorineReadings[0].recorded_at), "yyyy-MM-dd");
    const sameDateReadings = nextChlorineReadings.filter(
      (r) => format(parseISO(r.recorded_at), "yyyy-MM-dd") === firstDate
    );
    const avg =
      sameDateReadings.reduce((sum, r) => sum + r.residual_level, 0) /
      sameDateReadings.length;
    nextChlorineAnchor = { date: firstDate, value: avg };
  }

  // Fetch previous month's meter readings to calculate carry total
  const prevMeterReadingsData = await getDailyUsage(
    `${prevMonth}-01`,
    `${month}-01`,
    meterId
  );

  // Calculate carry total using interpolation logic
  let carryTotal: number | null = null;
  if (prevMeterReadingsData.length > 0) {
    // Convert RPC result to ReadingPoint format
    const prevMeterAverages: ReadingPoint[] = prevMeterReadingsData.map((r) => ({
      date: r.date,
      value: r.total_usage,
    }));

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

  // Convert RPC result to ReadingPoint format for interpolation
  const meterAverages: ReadingPoint[] = meterReadingsData.map((r) => ({
    date: r.date,
    value: r.total_usage,
  }));

  // Group chlorine readings by date and calculate daily averages
  const chlorineByDate = new Map<string, number[]>();
  chlorineReadings?.forEach((r) => {
    const date = format(parseISO(r.recorded_at), "yyyy-MM-dd");
    if (!chlorineByDate.has(date)) {
      chlorineByDate.set(date, []);
    }
    chlorineByDate.get(date)!.push(r.residual_level);
  });

  const chlorineAverages: ReadingPoint[] = [];
  chlorineByDate.forEach((values, date) => {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    chlorineAverages.push({ date, value: avg });
  });

  // Get all days in the month
  const allDates = getDaysInMonth(month);

  // Include carry total as a data point so interpolation anchors to it
  const meterReadingsForInterpolation = [...meterAverages];
  if (carryTotal !== null) {
    const prevMonthDates = getDaysInMonth(prevMonth);
    meterReadingsForInterpolation.unshift({
      date: prevMonthDates[prevMonthDates.length - 1],
      value: carryTotal,
    });
  }

  // Include next month's first reading as forward anchor for interpolation
  if (nextMeterAnchor) {
    meterReadingsForInterpolation.push(nextMeterAnchor);
  }

  const chlorineReadingsForInterpolation = [...chlorineAverages];
  if (nextChlorineAnchor) {
    chlorineReadingsForInterpolation.push(nextChlorineAnchor);
  }

  // Interpolate missing days
  const interpolatedMeter = interpolateMissingDays(
    meterReadingsForInterpolation,
    allDates,
    true // Add variation for meter readings
  );
  const interpolatedChlorine = interpolateMissingDays(
    chlorineReadingsForInterpolation,
    allDates,
    false // No variation for chlorine
  );

  // Check if we have any data at all for each type
  const hasMeterData = meterAverages.length > 0;
  const hasChlorineData = chlorineAverages.length > 0;

  // Find the last actual reading dates (don't interpolate/extrapolate beyond these)
  const lastActualMeterDate = meterAverages.length > 0
    ? meterAverages.reduce((latest, r) => r.date > latest ? r.date : latest, meterAverages[0].date)
    : null;
  const lastActualChlorineDate = chlorineAverages.length > 0
    ? chlorineAverages.reduce((latest, r) => r.date > latest ? r.date : latest, chlorineAverages[0].date)
    : null;

  // Get today's date for comparison (no estimations for future dates)
  const today = format(new Date(), "yyyy-MM-dd");

  // Build the days array with daily usage calculation
  const days: ReportDayData[] = allDates.map((date, index) => {
    const meterData = interpolatedMeter[index];
    const chlorineData = interpolatedChlorine[index];
    const isFutureDate = date > today;

    // Don't show interpolated data for future dates or dates after last actual reading (unless there's a forward anchor)
    const isAfterLastMeterReading = !nextMeterAnchor && lastActualMeterDate !== null && date > lastActualMeterDate && meterData.isInterpolated;
    const isAfterLastChlorineReading = !nextChlorineAnchor && lastActualChlorineDate !== null && date > lastActualChlorineDate && chlorineData.isInterpolated;
    const showMeterData = hasMeterData && (!isFutureDate || !meterData.isInterpolated) && !isAfterLastMeterReading;
    const showChlorineData = hasChlorineData && (!isFutureDate || !chlorineData.isInterpolated) && !isAfterLastChlorineReading;

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
        const prevIsAfterLastReading = !nextMeterAnchor && lastActualMeterDate !== null && prevDate > lastActualMeterDate && prevMeterData.isInterpolated;
        const showPrevMeterData = hasMeterData && (!prevIsFutureDate || !prevMeterData.isInterpolated) && !prevIsAfterLastReading;

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
