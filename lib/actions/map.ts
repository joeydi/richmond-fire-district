"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  InfrastructurePoint,
  Parcel,
  ViewportBounds,
} from "@/lib/types/infrastructure";

const PARCEL_LIMIT = 500;

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

/**
 * Fetch parcels within the given viewport bounds using PostGIS spatial query
 */
export async function getParcelsByViewport(
  bounds: ViewportBounds
): Promise<Parcel[]> {
  const supabase = await createClient();

  // Use PostGIS ST_Intersects with ST_MakeEnvelope to query by bounding box
  // ST_AsGeoJSON converts the geometry to GeoJSON format
  const { data, error } = await supabase.rpc("get_parcels_in_viewport", {
    min_lng: bounds.minLng,
    min_lat: bounds.minLat,
    max_lng: bounds.maxLng,
    max_lat: bounds.maxLat,
    limit_count: PARCEL_LIMIT,
  });

  if (error) {
    console.error("Error fetching parcels by viewport:", error);
    return [];
  }

  // Parse the geometry JSON string returned by ST_AsGeoJSON
  return (data ?? []).map((parcel: Parcel & { geometry: string }) => ({
    ...parcel,
    geometry: JSON.parse(parcel.geometry as string),
  }));
}

/**
 * Fetch a single parcel by ID
 */
export async function getParcelById(id: string): Promise<Parcel | null> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_parcel_by_id", {
    parcel_uuid: id,
  });

  if (error) {
    console.error("Error fetching parcel:", error);
    return null;
  }

  if (!data || data.length === 0) {
    return null;
  }

  const parcel = data[0];
  return {
    ...parcel,
    geometry: JSON.parse(parcel.geometry as string),
  };
}

/**
 * @deprecated Use getParcelsByViewport for better performance
 * Fetch all parcels (only for backwards compatibility)
 */
export async function getParcels(): Promise<Parcel[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parcels")
    .select("*")
    .limit(PARCEL_LIMIT);

  if (error) {
    console.error("Error fetching parcels:", error);
    return [];
  }

  return data ?? [];
}
