export type InfrastructureType =
  | "shutoff_valve"
  | "hydrant"
  | "well"
  | "meter"
  | "reservoir";

export type InfrastructureStatus = "active" | "inactive" | "maintenance";

export interface InfrastructurePoint {
  id: string;
  type: InfrastructureType;
  name: string;
  lat: number;
  lng: number;
  status: InfrastructureStatus;
  properties: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Parcel {
  id: string;
  parcel_id: string;
  owner_name: string | null;
  address: string | null;
  geometry: GeoJSON.Geometry;
  properties?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ViewportBounds {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export const INFRASTRUCTURE_COLORS: Record<InfrastructureType, string> = {
  shutoff_valve: "#EF4444", // red
  hydrant: "#F97316", // orange
  well: "#3B82F6", // blue
  meter: "#22C55E", // green
  reservoir: "#8B5CF6", // purple
};

export const INFRASTRUCTURE_LABELS: Record<InfrastructureType, string> = {
  shutoff_valve: "Shutoff Valve",
  hydrant: "Hydrant",
  well: "Well",
  meter: "Meter",
  reservoir: "Reservoir",
};
