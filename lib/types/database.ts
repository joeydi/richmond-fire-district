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
  max_level_inches: number | null;
  location: string | null;
  created_at: string;
  updated_at: string;
}

export interface MeterReading {
  id: string;
  recorded_at: string;
  meter_id: string | null;
  reading_value: number;
  production_rate: number | null;
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
  level_inches: number;
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

export type DigestFrequency = "daily" | "weekly";

export interface NotificationPreferences {
  id: string;
  user_id: string;

  // Contact information
  phone_number: string | null;

  // New log post notifications
  notify_new_log_posts: boolean;
  notify_new_log_posts_email: boolean;
  notify_new_log_posts_sms: boolean;

  // Missing meter reading alerts
  notify_missing_meter_readings: boolean;
  notify_missing_meter_readings_email: boolean;
  notify_missing_meter_readings_sms: boolean;
  missing_meter_reading_days: number;

  // Missing chlorine reading alerts
  notify_missing_chlorine_readings: boolean;
  notify_missing_chlorine_readings_email: boolean;
  notify_missing_chlorine_readings_sms: boolean;
  missing_chlorine_reading_days: number;

  // Digest preferences
  digest_enabled: boolean;
  digest_frequency: DigestFrequency;
  digest_email: boolean;

  created_at: string;
  updated_at: string;
}
