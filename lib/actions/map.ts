"use server";

import { createClient } from "@/lib/supabase/server";
import type { InfrastructurePoint, Parcel } from "@/lib/types/infrastructure";

export async function getInfrastructurePoints(): Promise<InfrastructurePoint[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("infrastructure_points")
    .select("*")
    .order("name");

  if (error) {
    console.error("Error fetching infrastructure points:", error);
    return [];
  }

  return data ?? [];
}

export async function getParcels(): Promise<Parcel[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parcels")
    .select("*")
    .order("parcel_id");

  if (error) {
    console.error("Error fetching parcels:", error);
    return [];
  }

  return data ?? [];
}
