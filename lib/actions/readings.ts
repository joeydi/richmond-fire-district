"use server";

import { createClient } from "@/lib/supabase/server";
import { requireEditor } from "@/lib/auth/roles";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Validation schemas
const meterReadingSchema = z.object({
  meterId: z.string().uuid("Invalid meter"),
  readingValue: z.number().positive("Reading must be positive"),
  recordedAt: z.string().datetime(),
  notes: z.string().optional(),
});

const chlorineSchema = z.object({
  locationId: z.string().uuid("Invalid location").optional(),
  residualLevel: z
    .number()
    .min(0, "Level must be at least 0")
    .max(10, "Level must be at most 10"),
  recordedAt: z.string().datetime(),
  notes: z.string().optional(),
});

const reservoirSchema = z.object({
  reservoirId: z.string().uuid("Invalid reservoir"),
  levelInches: z.number().min(0, "Level must be positive"),
  levelPercent: z.number().min(0).max(100).optional(),
  recordedAt: z.string().datetime(),
  notes: z.string().optional(),
});

export type MeterReadingInput = z.infer<typeof meterReadingSchema>;
export type ChlorineInput = z.infer<typeof chlorineSchema>;
export type ReservoirInput = z.infer<typeof reservoirSchema>;

const FIVE_MINUTES_MS = 5 * 60 * 1000;

async function calculateProductionRate(
  meterId: string,
  readingValue: number,
  recordedAt: Date,
  excludeId?: string
): Promise<number | null> {
  const supabase = await createClient();
  const windowStart = new Date(recordedAt.getTime() - FIVE_MINUTES_MS);
  const windowEnd = new Date(recordedAt.getTime() + FIVE_MINUTES_MS);

  let query = supabase
    .from("meter_readings")
    .select("id, reading_value, recorded_at")
    .eq("meter_id", meterId)
    .gte("recorded_at", windowStart.toISOString())
    .lte("recorded_at", windowEnd.toISOString())
    .order("recorded_at", { ascending: true });

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data: nearbyReadings, error } = await query;

  if (error || !nearbyReadings || nearbyReadings.length === 0) {
    return null;
  }

  // Find readings that are OLDER than the new reading
  const olderReadings = nearbyReadings.filter(
    (r) => new Date(r.recorded_at) < recordedAt
  );

  if (olderReadings.length === 0) {
    return null;
  }

  // Get the most recent older reading (closest to the new reading)
  const olderReading = olderReadings[olderReadings.length - 1];

  // Only calculate rate if new value > old value (not a meter reset)
  if (readingValue <= olderReading.reading_value) {
    return null;
  }

  const valueDiff = readingValue - olderReading.reading_value;
  const timeDiffMinutes =
    (recordedAt.getTime() - new Date(olderReading.recorded_at).getTime()) /
    (1000 * 60);

  return timeDiffMinutes > 0 ? valueDiff / timeDiffMinutes : null;
}

export async function insertMeterReading(
  input: MeterReadingInput
): Promise<{ success: boolean; error?: string }> {
  const user = await requireEditor();

  const parsed = meterReadingSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const productionRate = await calculateProductionRate(
    parsed.data.meterId,
    parsed.data.readingValue,
    new Date(parsed.data.recordedAt)
  );

  const supabase = await createClient();
  const { error } = await supabase.from("meter_readings").insert({
    meter_id: parsed.data.meterId,
    reading_value: parsed.data.readingValue,
    recorded_at: parsed.data.recordedAt,
    production_rate: productionRate,
    notes: parsed.data.notes || null,
    created_by: user.id,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/readings/meter");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function insertChlorineReading(
  input: ChlorineInput
): Promise<{ success: boolean; error?: string }> {
  const user = await requireEditor();

  const parsed = chlorineSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("chlorine_readings").insert({
    location_id: parsed.data.locationId || null,
    residual_level: parsed.data.residualLevel,
    recorded_at: parsed.data.recordedAt,
    notes: parsed.data.notes || null,
    created_by: user.id,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/readings/chlorine");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function insertReservoirReading(
  input: ReservoirInput
): Promise<{ success: boolean; error?: string }> {
  const user = await requireEditor();

  const parsed = reservoirSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("reservoir_readings").insert({
    reservoir_id: parsed.data.reservoirId,
    level_inches: parsed.data.levelInches,
    level_percent: parsed.data.levelPercent || null,
    recorded_at: parsed.data.recordedAt,
    notes: parsed.data.notes || null,
    created_by: user.id,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/readings/reservoir");
  revalidatePath("/dashboard");
  return { success: true };
}

// Data fetching for forms
export async function getMeters() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("meters")
    .select("id, name")
    .order("name");
  return data ?? [];
}

export async function getReservoirs() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reservoirs")
    .select("id, name, max_level_inches")
    .order("name");
  return data ?? [];
}

export async function getInfrastructureLocations() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("infrastructure_points")
    .select("id, name, type")
    .order("name");
  return data ?? [];
}

// Readings history queries
export interface ReadingsHistoryParams {
  limit?: number;
  offset?: number;
}

export interface MeterReadingRow {
  id: string;
  meter_id: string;
  reading_value: number;
  production_rate: number | null;
  recorded_at: string;
  notes: string | null;
  meter_name: string | null;
}

export interface ChlorineReadingRow {
  id: string;
  location_id: string | null;
  residual_level: number;
  recorded_at: string;
  notes: string | null;
  location_name: string | null;
}

export interface ReservoirReadingRow {
  id: string;
  reservoir_id: string;
  level_inches: number;
  level_percent: number | null;
  recorded_at: string;
  notes: string | null;
  reservoir_name: string | null;
}

export async function getMeterReadingsHistory(
  params: ReadingsHistoryParams = {}
): Promise<{ data: MeterReadingRow[]; count: number }> {
  const { limit = 50, offset = 0 } = params;
  const supabase = await createClient();

  const { data, count, error } = await supabase
    .from("meter_readings")
    .select(
      "id, meter_id, reading_value, production_rate, recorded_at, notes, meters (name)",
      {
        count: "exact",
      }
    )
    .order("recorded_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Error fetching meter readings:", error);
    return { data: [], count: 0 };
  }

  const readings: MeterReadingRow[] = (data ?? []).map((r: any) => ({
    id: r.id,
    meter_id: r.meter_id,
    reading_value: r.reading_value,
    production_rate: r.production_rate,
    recorded_at: r.recorded_at,
    notes: r.notes,
    meter_name: r.meters?.name ?? null,
  }));

  return { data: readings, count: count ?? 0 };
}

export async function getChlorineReadingsHistory(
  params: ReadingsHistoryParams = {}
): Promise<{ data: ChlorineReadingRow[]; count: number }> {
  const { limit = 50, offset = 0 } = params;
  const supabase = await createClient();

  const { data, count, error } = await supabase
    .from("chlorine_readings")
    .select("id, location_id, residual_level, recorded_at, notes, infrastructure_points (name)", {
      count: "exact",
    })
    .order("recorded_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Error fetching chlorine readings:", error);
    return { data: [], count: 0 };
  }

  const readings: ChlorineReadingRow[] = (data ?? []).map((r: any) => ({
    id: r.id,
    location_id: r.location_id ?? null,
    residual_level: r.residual_level,
    recorded_at: r.recorded_at,
    notes: r.notes,
    location_name: r.infrastructure_points?.name ?? null,
  }));

  return { data: readings, count: count ?? 0 };
}

export async function getReservoirReadingsHistory(
  params: ReadingsHistoryParams = {}
): Promise<{ data: ReservoirReadingRow[]; count: number }> {
  const { limit = 50, offset = 0 } = params;
  const supabase = await createClient();

  try {
    const { data, count, error } = await supabase
      .from("reservoir_readings")
      .select("id, recorded_at, reservoir_id, level_inches, level_percent, notes", {
        count: "exact",
      })
      .order("recorded_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Supabase error fetching reservoir readings:", error);
      return { data: [], count: 0 };
    }

    if (!data) {
      console.warn("No data returned from reservoir_readings query");
      return { data: [], count: count ?? 0 };
    }

    // Fetch reservoir names separately
    let reservoirNames: Record<string, string> = {};
    const validReservoirIds = (data as Array<{ reservoir_id: string | null }>)
      .map(r => r.reservoir_id)
      .filter((id): id is string => id !== null);

    if (validReservoirIds.length > 0) {
      const uniqueIds = [...new Set(validReservoirIds)];
      const { data: reservoirs, error: resError } = await supabase
        .from("reservoirs")
        .select("id, name")
        .in("id", uniqueIds);

      if (resError) {
        console.error("Error fetching reservoir names:", resError);
      } else if (reservoirs) {
        reservoirNames = Object.fromEntries(
          reservoirs.map((r: { id: string; name: string }) => [r.id, r.name])
        );
      }
    }

    const readings: ReservoirReadingRow[] = (data as Array<{ id: string; level_inches: number; level_percent: number | null; recorded_at: string; notes: string | null; reservoir_id: string | null }>).map((r) => ({
      id: r.id,
      reservoir_id: r.reservoir_id!,
      level_inches: r.level_inches,
      level_percent: r.level_percent,
      recorded_at: r.recorded_at,
      notes: r.notes,
      reservoir_name: r.reservoir_id ? (reservoirNames[r.reservoir_id] ?? null) : null,
    }));

    return { data: readings, count: count ?? 0 };
  } catch (err) {
    console.error("Exception fetching reservoir readings:", err);
    return { data: [], count: 0 };
  }
}

// Get last reading functions
export async function getLastMeterReading(
  meterId: string
): Promise<number | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("meter_readings")
    .select("reading_value")
    .eq("meter_id", meterId)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return data.reading_value;
}

export async function getLastChlorineReading(): Promise<number | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("chlorine_readings")
    .select("residual_level")
    .order("recorded_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return data.residual_level;
}

export async function getLastReservoirReading(
  reservoirId: string
): Promise<number | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("reservoir_readings")
    .select("level_inches")
    .eq("reservoir_id", reservoirId)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return data.level_inches;
}

// Update functions
export async function updateMeterReading(
  id: string,
  input: MeterReadingInput
): Promise<{ success: boolean; error?: string }> {
  await requireEditor();

  const parsed = meterReadingSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const productionRate = await calculateProductionRate(
    parsed.data.meterId,
    parsed.data.readingValue,
    new Date(parsed.data.recordedAt),
    id
  );

  const supabase = await createClient();
  const { error } = await supabase
    .from("meter_readings")
    .update({
      meter_id: parsed.data.meterId,
      reading_value: parsed.data.readingValue,
      recorded_at: parsed.data.recordedAt,
      production_rate: productionRate,
      notes: parsed.data.notes || null,
    })
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/readings");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateChlorineReading(
  id: string,
  input: ChlorineInput
): Promise<{ success: boolean; error?: string }> {
  await requireEditor();

  const parsed = chlorineSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("chlorine_readings")
    .update({
      location_id: parsed.data.locationId || null,
      residual_level: parsed.data.residualLevel,
      recorded_at: parsed.data.recordedAt,
      notes: parsed.data.notes || null,
    })
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/readings");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateReservoirReading(
  id: string,
  input: ReservoirInput
): Promise<{ success: boolean; error?: string }> {
  await requireEditor();

  const parsed = reservoirSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("reservoir_readings")
    .update({
      reservoir_id: parsed.data.reservoirId,
      level_inches: parsed.data.levelInches,
      level_percent: parsed.data.levelPercent || null,
      recorded_at: parsed.data.recordedAt,
      notes: parsed.data.notes || null,
    })
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/readings");
  revalidatePath("/dashboard");
  return { success: true };
}

// Delete functions
export async function deleteMeterReading(
  id: string
): Promise<{ success: boolean; error?: string }> {
  await requireEditor();

  const supabase = await createClient();
  const { error } = await supabase.from("meter_readings").delete().eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/readings");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteChlorineReading(
  id: string
): Promise<{ success: boolean; error?: string }> {
  await requireEditor();

  const supabase = await createClient();
  const { error } = await supabase.from("chlorine_readings").delete().eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/readings");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteReservoirReading(
  id: string
): Promise<{ success: boolean; error?: string }> {
  await requireEditor();

  const supabase = await createClient();
  const { error } = await supabase.from("reservoir_readings").delete().eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/readings");
  revalidatePath("/dashboard");
  return { success: true };
}
