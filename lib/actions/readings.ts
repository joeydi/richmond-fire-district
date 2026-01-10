"use server";

import { createClient } from "@/lib/supabase/server";
import { requireEditor } from "@/lib/auth/roles";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Validation schemas
const waterProductionSchema = z.object({
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
  levelFeet: z.number().min(0, "Level must be positive"),
  levelPercent: z.number().min(0).max(100).optional(),
  recordedAt: z.string().datetime(),
  notes: z.string().optional(),
});

export type WaterProductionInput = z.infer<typeof waterProductionSchema>;
export type ChlorineInput = z.infer<typeof chlorineSchema>;
export type ReservoirInput = z.infer<typeof reservoirSchema>;

export async function insertWaterProductionReading(
  input: WaterProductionInput
): Promise<{ success: boolean; error?: string }> {
  const user = await requireEditor();

  const parsed = waterProductionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("water_production_readings").insert({
    meter_id: parsed.data.meterId,
    reading_value: parsed.data.readingValue,
    recorded_at: parsed.data.recordedAt,
    notes: parsed.data.notes || null,
    created_by: user.id,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/readings/water-production");
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
    level_feet: parsed.data.levelFeet,
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
    .select("id, name, max_level_feet")
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
