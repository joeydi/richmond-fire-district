"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/roles";
import {
  INFRASTRUCTURE_LABELS,
  type InfrastructurePoint,
  type InfrastructureType,
} from "@/lib/types/infrastructure";

const STORAGE_BUCKET = "infrastructure-images";
const SIGNED_URL_EXPIRY_SECONDS = 3600;

export interface ReportImage {
  id: string;
  url: string;
  filename: string;
}

export interface ReportPoint extends InfrastructurePoint {
  images: ReportImage[];
}

export interface ReportGroup {
  type: InfrastructureType;
  label: string;
  points: ReportPoint[];
}

export interface InfrastructureReportData {
  groups: ReportGroup[];
  totalPoints: number;
  totalImages: number;
  generatedAt: string;
}

/**
 * Fetch every active infrastructure point, grouped by type, with signed URLs for
 * all of its images. Used by the downloadable infrastructure PDF report.
 */
export async function getInfrastructureReportData(): Promise<InfrastructureReportData> {
  await requireAuth();

  const supabase = await createClient();
  const generatedAt = new Date().toISOString();

  const { data: points, error: pointsError } = await supabase
    .from("infrastructure_points")
    .select("*")
    .eq("status", "active")
    .order("name", { ascending: true });

  if (pointsError) {
    console.error("Error fetching infrastructure report points:", pointsError);
    return { groups: [], totalPoints: 0, totalImages: 0, generatedAt };
  }

  const activePoints = (points ?? []) as InfrastructurePoint[];

  if (activePoints.length === 0) {
    return { groups: [], totalPoints: 0, totalImages: 0, generatedAt };
  }

  const imagesByPoint = await getImagesForPoints(
    supabase,
    activePoints.map((point) => point.id)
  );

  // Build groups in legend order, omitting any type with no active points
  const groups: ReportGroup[] = [];
  let totalImages = 0;

  for (const [type, label] of Object.entries(INFRASTRUCTURE_LABELS) as [
    InfrastructureType,
    string,
  ][]) {
    const groupPoints = activePoints
      .filter((point) => point.type === type)
      .map((point) => {
        const images = imagesByPoint.get(point.id) ?? [];
        totalImages += images.length;
        return { ...point, images };
      });

    if (groupPoints.length > 0) {
      groups.push({ type, label, points: groupPoints });
    }
  }

  return {
    groups,
    totalPoints: activePoints.length,
    totalImages,
    generatedAt,
  };
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Fetch all images for the given points and sign them in a single batch call,
 * rather than one signing round-trip per image.
 */
async function getImagesForPoints(
  supabase: SupabaseServerClient,
  pointIds: string[]
): Promise<Map<string, ReportImage[]>> {
  const byPoint = new Map<string, ReportImage[]>();

  const { data: images, error } = await supabase
    .from("infrastructure_images")
    .select("id, infrastructure_point_id, storage_path, filename")
    .in("infrastructure_point_id", pointIds)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching infrastructure report images:", error);
    return byPoint;
  }

  const rows = images ?? [];
  if (rows.length === 0) {
    return byPoint;
  }

  const { data: signed, error: signError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrls(
      rows.map((row) => row.storage_path),
      SIGNED_URL_EXPIRY_SECONDS
    );

  if (signError) {
    console.error("Error signing infrastructure report images:", signError);
    return byPoint;
  }

  const urlByPath = new Map<string, string>();
  for (const entry of signed ?? []) {
    if (entry.path && entry.signedUrl) {
      urlByPath.set(entry.path, entry.signedUrl);
    }
  }

  for (const row of rows) {
    const url = urlByPath.get(row.storage_path);
    if (!url) continue; // Skip images that failed to sign

    const existing = byPoint.get(row.infrastructure_point_id);
    const image: ReportImage = { id: row.id, url, filename: row.filename };

    if (existing) {
      existing.push(image);
    } else {
      byPoint.set(row.infrastructure_point_id, [image]);
    }
  }

  return byPoint;
}
