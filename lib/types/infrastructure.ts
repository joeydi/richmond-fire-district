export type InfrastructureType =
  | "shutoff_valve"
  | "hydrant"
  | "well"
  | "meter"
  | "reservoir"
  | "other";

export type InfrastructureStatus = "active" | "inactive" | "maintenance" | "unknown";

export interface InfrastructurePoint {
  id: string;
  type: InfrastructureType;
  name: string;
  latitude: number;
  longitude: number;
  status: InfrastructureStatus;
  notes?: string | null;
  properties: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface InfrastructureImage {
  id: string;
  infrastructure_point_id: string;
  storage_path: string;
  filename: string;
  size_bytes?: number;
  mime_type?: string;
  url?: string; // Signed URL for display
  created_at: string;
  created_by?: string;
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
  other: "#6B7280", // gray
};

export const INFRASTRUCTURE_LABELS: Record<InfrastructureType, string> = {
  shutoff_valve: "Shutoff Valve",
  hydrant: "Hydrant",
  well: "Well",
  meter: "Meter",
  reservoir: "Reservoir",
  other: "Other",
};

export const INFRASTRUCTURE_STATUS_LABELS: Record<InfrastructureStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  maintenance: "Maintenance",
  unknown: "Unknown",
};

export const INFRASTRUCTURE_STATUS_COLORS: Record<InfrastructureStatus, string> = {
  active: "#22C55E", // green
  inactive: "#6B7280", // gray
  maintenance: "#F59E0B", // amber
  unknown: "#9CA3AF", // gray-400
};
