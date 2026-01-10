"use server";

import { createClient } from "@/lib/supabase/server";
import { requireEditor } from "@/lib/auth/roles";
import { revalidatePath } from "next/cache";
import { parse, isValid, setHours, setMinutes, setSeconds, setMilliseconds } from "date-fns";

export interface ColumnMapping {
  date: string | null;
  meter: string | null;
  chlorine: string | null;
  reservoir: string | null;
}

export interface ImportConfig {
  meterId: string | null;
  reservoirId: string | null;
  updateExisting: boolean;
}

export interface ParsedRow {
  rowIndex: number;
  date: Date;
  meterValue: number | null;
  chlorineValue: number | null;
  reservoirValue: number | null;
}

export interface ParseError {
  row: number;
  message: string;
}

export interface DuplicateInfo {
  row: number;
  date: string;
  type: "meter" | "chlorine" | "reservoir";
}

export interface ValidationResult {
  success: boolean;
  parsedRows: ParsedRow[];
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  errors: ParseError[];
  duplicates: DuplicateInfo[];
}

export interface ImportResult {
  success: boolean;
  inserted: number;
  updated: number;
  skipped: number;
  errors: ParseError[];
}

// Common date formats to try
const DATE_FORMATS = [
  "yyyy-MM-dd'T'HH:mm:ss",
  "yyyy-MM-dd'T'HH:mm",
  "yyyy-MM-dd HH:mm:ss",
  "yyyy-MM-dd HH:mm",
  "MM/dd/yyyy HH:mm:ss",
  "MM/dd/yyyy HH:mm",
  "M/d/yyyy HH:mm:ss",
  "M/d/yyyy HH:mm",
  "MM/dd/yyyy",
  "M/d/yyyy",
  "yyyy-MM-dd",
  "MM-dd-yyyy",
  "M-d-yyyy",
  "dd/MM/yyyy",
  "d/M/yyyy",
];

/**
 * Parse a date string, trying multiple common formats.
 * If no time component is present, defaults to 12:00 PM.
 */
function parseDate(dateStr: string): { date: Date | null; hadTime: boolean } {
  if (!dateStr || !dateStr.trim()) {
    return { date: null, hadTime: false };
  }

  const trimmed = dateStr.trim();

  // Check if the string likely has a time component
  const hasTimeComponent = /\d{1,2}:\d{2}/.test(trimmed);

  // Try parsing with date-fns
  for (const format of DATE_FORMATS) {
    // Skip time formats if we don't have a time component
    if (!hasTimeComponent && format.includes("HH:mm")) {
      continue;
    }
    // Skip date-only formats if we have a time component
    if (hasTimeComponent && !format.includes("HH:mm")) {
      continue;
    }

    const parsed = parse(trimmed, format, new Date());
    if (isValid(parsed)) {
      // If no time component, set to 12:00 PM
      if (!hasTimeComponent) {
        const withNoon = setMilliseconds(
          setSeconds(setMinutes(setHours(parsed, 12), 0), 0),
          0
        );
        return { date: withNoon, hadTime: false };
      }
      return { date: parsed, hadTime: true };
    }
  }

  // Try native Date parsing as fallback
  const nativeParsed = new Date(trimmed);
  if (isValid(nativeParsed)) {
    if (!hasTimeComponent) {
      const withNoon = setMilliseconds(
        setSeconds(setMinutes(setHours(nativeParsed, 12), 0), 0),
        0
      );
      return { date: withNoon, hadTime: false };
    }
    return { date: nativeParsed, hadTime: true };
  }

  return { date: null, hadTime: false };
}

/**
 * Parse a numeric value from a string, handling common formats.
 */
function parseNumericValue(value: string): number | null {
  if (!value || !value.trim()) {
    return null;
  }

  // Remove commas and whitespace
  const cleaned = value.trim().replace(/,/g, "");

  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) {
    return null;
  }

  return parsed;
}

/**
 * Validate and parse CSV data for import.
 * Returns parsed rows and any errors found.
 */
export async function validateImportData(
  headers: string[],
  rows: string[][],
  mapping: ColumnMapping,
  config: ImportConfig
): Promise<ValidationResult> {
  await requireEditor();

  const errors: ParseError[] = [];
  const parsedRows: ParsedRow[] = [];

  // Get column indices
  const dateIndex = mapping.date ? headers.indexOf(mapping.date) : -1;
  const meterIndex = mapping.meter ? headers.indexOf(mapping.meter) : -1;
  const chlorineIndex = mapping.chlorine ? headers.indexOf(mapping.chlorine) : -1;
  const reservoirIndex = mapping.reservoir ? headers.indexOf(mapping.reservoir) : -1;

  if (dateIndex === -1) {
    return {
      success: false,
      parsedRows: [],
      validRows: 0,
      invalidRows: rows.length,
      duplicateRows: 0,
      errors: [{ row: 0, message: "Date column not found in headers" }],
      duplicates: [],
    };
  }

  // Parse each row
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2; // +2 because: 1-indexed + header row

    // Skip completely empty rows
    if (row.every((cell) => !cell.trim())) {
      continue;
    }

    // Parse date
    const dateStr = row[dateIndex];
    const { date } = parseDate(dateStr);

    if (!date) {
      errors.push({ row: rowNumber, message: `Invalid date: "${dateStr}"` });
      continue;
    }

    // Parse values
    const meterValue = meterIndex >= 0 ? parseNumericValue(row[meterIndex]) : null;
    const chlorineValue = chlorineIndex >= 0 ? parseNumericValue(row[chlorineIndex]) : null;
    const reservoirValue = reservoirIndex >= 0 ? parseNumericValue(row[reservoirIndex]) : null;

    // Check if at least one value is present
    const hasValue = meterValue !== null || chlorineValue !== null || reservoirValue !== null;

    if (!hasValue) {
      errors.push({ row: rowNumber, message: "No reading values found in row" });
      continue;
    }

    // Validate meter value if column is mapped
    if (meterIndex >= 0 && row[meterIndex]?.trim() && meterValue === null) {
      errors.push({ row: rowNumber, message: `Invalid meter reading: "${row[meterIndex]}"` });
      continue;
    }

    // Validate chlorine value if column is mapped
    if (chlorineIndex >= 0 && row[chlorineIndex]?.trim() && chlorineValue === null) {
      errors.push({ row: rowNumber, message: `Invalid chlorine reading: "${row[chlorineIndex]}"` });
      continue;
    }

    // Validate reservoir value if column is mapped
    if (reservoirIndex >= 0 && row[reservoirIndex]?.trim() && reservoirValue === null) {
      errors.push({ row: rowNumber, message: `Invalid reservoir reading: "${row[reservoirIndex]}"` });
      continue;
    }

    parsedRows.push({
      rowIndex: rowNumber,
      date,
      meterValue,
      chlorineValue,
      reservoirValue,
    });
  }

  // Check for duplicates in database
  const duplicates: DuplicateInfo[] = [];

  if (parsedRows.length > 0) {
    const supabase = await createClient();
    const dates = parsedRows.map((r) => r.date.toISOString());

    // Check meter duplicates
    if (mapping.meter && config.meterId) {
      const { data: existingMeter } = await supabase
        .from("water_production_readings")
        .select("recorded_at")
        .eq("meter_id", config.meterId)
        .in("recorded_at", dates);

      if (existingMeter) {
        const existingDates = new Set(existingMeter.map((r) => r.recorded_at));
        parsedRows.forEach((row) => {
          if (existingDates.has(row.date.toISOString()) && row.meterValue !== null) {
            duplicates.push({
              row: row.rowIndex,
              date: row.date.toISOString(),
              type: "meter",
            });
          }
        });
      }
    }

    // Check chlorine duplicates
    if (mapping.chlorine) {
      const { data: existingChlorine } = await supabase
        .from("chlorine_readings")
        .select("recorded_at")
        .in("recorded_at", dates);

      if (existingChlorine) {
        const existingDates = new Set(existingChlorine.map((r) => r.recorded_at));
        parsedRows.forEach((row) => {
          if (existingDates.has(row.date.toISOString()) && row.chlorineValue !== null) {
            duplicates.push({
              row: row.rowIndex,
              date: row.date.toISOString(),
              type: "chlorine",
            });
          }
        });
      }
    }

    // Check reservoir duplicates
    if (mapping.reservoir && config.reservoirId) {
      const { data: existingReservoir } = await supabase
        .from("reservoir_readings")
        .select("recorded_at")
        .eq("reservoir_id", config.reservoirId)
        .in("recorded_at", dates);

      if (existingReservoir) {
        const existingDates = new Set(existingReservoir.map((r) => r.recorded_at));
        parsedRows.forEach((row) => {
          if (existingDates.has(row.date.toISOString()) && row.reservoirValue !== null) {
            duplicates.push({
              row: row.rowIndex,
              date: row.date.toISOString(),
              type: "reservoir",
            });
          }
        });
      }
    }
  }

  // Count unique rows with duplicates
  const rowsWithDuplicates = new Set(duplicates.map((d) => d.row)).size;

  return {
    success: errors.length === 0,
    parsedRows,
    validRows: parsedRows.length,
    invalidRows: errors.length,
    duplicateRows: rowsWithDuplicates,
    errors,
    duplicates,
  };
}

/**
 * Execute the import, inserting or updating records as specified.
 */
export async function executeImport(
  parsedRows: ParsedRow[],
  mapping: ColumnMapping,
  config: ImportConfig,
  duplicates: DuplicateInfo[]
): Promise<ImportResult> {
  const user = await requireEditor();
  const supabase = await createClient();

  const errors: ParseError[] = [];
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  // Create sets of duplicate dates for quick lookup
  const meterDuplicateDates = new Set(
    duplicates.filter((d) => d.type === "meter").map((d) => d.date)
  );
  const chlorineDuplicateDates = new Set(
    duplicates.filter((d) => d.type === "chlorine").map((d) => d.date)
  );
  const reservoirDuplicateDates = new Set(
    duplicates.filter((d) => d.type === "reservoir").map((d) => d.date)
  );

  for (const row of parsedRows) {
    const dateISO = row.date.toISOString();

    // Handle meter readings
    if (row.meterValue !== null && mapping.meter && config.meterId) {
      const isDuplicate = meterDuplicateDates.has(dateISO);

      if (isDuplicate) {
        if (config.updateExisting) {
          const { error } = await supabase
            .from("water_production_readings")
            .update({
              reading_value: row.meterValue,
              updated_at: new Date().toISOString(),
            })
            .eq("meter_id", config.meterId)
            .eq("recorded_at", dateISO);

          if (error) {
            errors.push({ row: row.rowIndex, message: `Meter update failed: ${error.message}` });
          } else {
            updated++;
          }
        } else {
          skipped++;
        }
      } else {
        const { error } = await supabase.from("water_production_readings").insert({
          meter_id: config.meterId,
          reading_value: row.meterValue,
          recorded_at: dateISO,
          created_by: user.id,
        });

        if (error) {
          errors.push({ row: row.rowIndex, message: `Meter insert failed: ${error.message}` });
        } else {
          inserted++;
        }
      }
    }

    // Handle chlorine readings
    if (row.chlorineValue !== null && mapping.chlorine) {
      const isDuplicate = chlorineDuplicateDates.has(dateISO);

      if (isDuplicate) {
        if (config.updateExisting) {
          const { error } = await supabase
            .from("chlorine_readings")
            .update({
              residual_level: row.chlorineValue,
              updated_at: new Date().toISOString(),
            })
            .eq("recorded_at", dateISO);

          if (error) {
            errors.push({ row: row.rowIndex, message: `Chlorine update failed: ${error.message}` });
          } else {
            updated++;
          }
        } else {
          skipped++;
        }
      } else {
        const { error } = await supabase.from("chlorine_readings").insert({
          residual_level: row.chlorineValue,
          recorded_at: dateISO,
          created_by: user.id,
        });

        if (error) {
          errors.push({ row: row.rowIndex, message: `Chlorine insert failed: ${error.message}` });
        } else {
          inserted++;
        }
      }
    }

    // Handle reservoir readings
    if (row.reservoirValue !== null && mapping.reservoir && config.reservoirId) {
      const isDuplicate = reservoirDuplicateDates.has(dateISO);

      if (isDuplicate) {
        if (config.updateExisting) {
          const { error } = await supabase
            .from("reservoir_readings")
            .update({
              level_feet: row.reservoirValue,
              updated_at: new Date().toISOString(),
            })
            .eq("reservoir_id", config.reservoirId)
            .eq("recorded_at", dateISO);

          if (error) {
            errors.push({ row: row.rowIndex, message: `Reservoir update failed: ${error.message}` });
          } else {
            updated++;
          }
        } else {
          skipped++;
        }
      } else {
        const { error } = await supabase.from("reservoir_readings").insert({
          reservoir_id: config.reservoirId,
          level_feet: row.reservoirValue,
          recorded_at: dateISO,
          created_by: user.id,
        });

        if (error) {
          errors.push({ row: row.rowIndex, message: `Reservoir insert failed: ${error.message}` });
        } else {
          inserted++;
        }
      }
    }
  }

  // Revalidate relevant paths
  revalidatePath("/dashboard/readings");
  revalidatePath("/dashboard");

  return {
    success: errors.length === 0,
    inserted,
    updated,
    skipped,
    errors,
  };
}
