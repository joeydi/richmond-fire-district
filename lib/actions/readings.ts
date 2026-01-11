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

export async function insertMeterReading(
  input: MeterReadingInput
): Promise<{ success: boolean; error?: string }> {
  const user = await requireEditor();

  const parsed = meterReadingSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("meter_readings").insert({
    meter_id: parsed.data.meterId,
    reading_value: parsed.data.readingValue,
    recorded_at: parsed.data.recordedAt,
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
  reading_value: number;
  recorded_at: string;
  notes: string | null;
  meter_name: string | null;
}

export interface ChlorineReadingRow {
  id: string;
  residual_level: number;
  recorded_at: string;
  notes: string | null;
  location_name: string | null;
}

export interface ReservoirReadingRow {
  id: string;
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
    .select("id, reading_value, recorded_at, notes, meters (name)", {
      count: "exact",
    })
    .order("recorded_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Error fetching meter readings:", error);
    return { data: [], count: 0 };
  }

  const readings: MeterReadingRow[] = (data ?? []).map((r: any) => ({
    id: r.id,
    reading_value: r.reading_value,
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
    .select("id, residual_level, recorded_at, notes, infrastructure_points (name)", {
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

  const { data, count, error } = await supabase
    .from("reservoir_readings")
    .select("id, level_inches, level_percent, recorded_at, notes, reservoir_id", {
      count: "exact",
    })
    .order("recorded_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Error fetching reservoir readings:", error);
    return { data: [], count: 0 };
  }

  // Fetch reservoir names separately
  let reservoirNames: Record<string, string> = {};
  if (data && data.length > 0) {
    const reservoirIds = [...new Set((data as Array<{ reservoir_id: string }>).map(r => r.reservoir_id))];
    const { data: reservoirs } = await supabase
      .from("reservoirs")
      .select("id, name")
      .in("id", reservoirIds);

    reservoirNames = Object.fromEntries(
      (reservoirs ?? []).map((r: { id: string; name: string }) => [r.id, r.name])
    );
  }

  const readings: ReservoirReadingRow[] = (data ?? []).map((r: { id: string; level_inches: number; level_percent: number | null; recorded_at: string; notes: string | null; reservoir_id: string }) => ({
    id: r.id,
    level_inches: r.level_inches,
    level_percent: r.level_percent,
    recorded_at: r.recorded_at,
    notes: r.notes,
    reservoir_name: reservoirNames[r.reservoir_id] ?? null,
  }));

  return { data: readings, count: count ?? 0 };
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

  const supabase = await createClient();
  const { error } = await supabase
    .from("meter_readings")
    .update({
      meter_id: parsed.data.meterId,
      reading_value: parsed.data.readingValue,
      recorded_at: parsed.data.recordedAt,
      notes: parsed.data.notes || null,
      updated_at: new Date().toISOString(),
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
      updated_at: new Date().toISOString(),
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
      updated_at: new Date().toISOString(),
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
