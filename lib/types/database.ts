export type UserRole = "admin" | "editor" | "member";

export type InfrastructureType =
  | "shutoff_valve"
  | "hydrant"
  | "well"
  | "meter"
  | "reservoir";

export type InfrastructureStatus =
  | "active"
  | "inactive"
  | "maintenance"
  | "unknown";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Meter {
  id: string;
  name: string;
  location: string | null;
  serial_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface Reservoir {
  id: string;
  name: string;
  capacity_gallons: number | null;
  max_level_feet: number | null;
  location: string | null;
  created_at: string;
  updated_at: string;
}

export interface WaterProductionReading {
  id: string;
  recorded_at: string;
  meter_id: string | null;
  reading_value: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ChlorineReading {
  id: string;
  recorded_at: string;
  location_id: string | null;
  residual_level: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ReservoirReading {
  id: string;
  recorded_at: string;
  reservoir_id: string | null;
  level_feet: number;
  level_percent: number | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface InfrastructurePoint {
  id: string;
  type: InfrastructureType;
  name: string;
  latitude: number;
  longitude: number;
  properties: Record<string, unknown>;
  status: InfrastructureStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  contact_type: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Parcel {
  id: string;
  parcel_id: string | null;
  owner_name: string | null;
  address: string | null;
  geometry: GeoJSON.Geometry;
  properties: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
