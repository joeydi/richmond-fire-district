"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Calendar, Droplets, FlaskConical, Waves } from "lucide-react";
import type { ParsedCSV, ColumnMapping, ImportConfig } from "./import-wizard";

interface Meter {
  id: string;
  name: string;
}

interface Reservoir {
  id: string;
  name: string;
  max_level_feet: number | null;
}

interface ColumnMapperProps {
  parsedCSV: ParsedCSV;
  meters: Meter[];
  reservoirs: Reservoir[];
  initialMapping?: ColumnMapping;
  initialConfig?: ImportConfig;
  onBack: () => void;
  onContinue: (mapping: ColumnMapping, config: ImportConfig) => void;
}

const UNMAPPED = "__unmapped__";

export function ColumnMapper({
  parsedCSV,
  meters,
  reservoirs,
  initialMapping,
  initialConfig,
  onBack,
  onContinue,
}: ColumnMapperProps) {
  const [mapping, setMapping] = useState<ColumnMapping>(
    initialMapping || {
      date: null,
      meter: null,
      chlorine: null,
      reservoir: null,
    }
  );
  const [config, setConfig] = useState<ImportConfig>(
    initialConfig || {
      meterId: null,
      reservoirId: null,
      updateExisting: false,
    }
  );
  const [errors, setErrors] = useState<string[]>([]);

  // Auto-detect date column on mount
  useEffect(() => {
    if (!initialMapping) {
      const dateKeywords = ["date", "time", "timestamp", "recorded", "datetime"];
      const detectedDate = parsedCSV.headers.find((h) =>
        dateKeywords.some((k) => h.toLowerCase().includes(k))
      );
      if (detectedDate) {
        setMapping((prev) => ({ ...prev, date: detectedDate }));
      }
    }
  }, [parsedCSV.headers, initialMapping]);

  const handleMappingChange = (field: keyof ColumnMapping, value: string) => {
    setMapping((prev) => ({
      ...prev,
      [field]: value === UNMAPPED ? null : value,
    }));
    setErrors([]);
  };

  const handleConfigChange = (field: keyof ImportConfig, value: string | boolean) => {
    setConfig((prev) => ({
      ...prev,
      [field]: value === UNMAPPED ? null : value,
    }));
  };

  const validate = (): boolean => {
    const newErrors: string[] = [];

    if (!mapping.date) {
      newErrors.push("Date column is required");
    }

    const hasReadingType = mapping.meter || mapping.chlorine || mapping.reservoir;
    if (!hasReadingType) {
      newErrors.push("At least one reading type must be mapped (meter, chlorine, or reservoir)");
    }

    if (mapping.meter && !config.meterId) {
      newErrors.push("Please select a target meter for the meter readings");
    }

    if (mapping.reservoir && !config.reservoirId) {
      newErrors.push("Please select a target reservoir for the reservoir readings");
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleContinue = () => {
    if (validate()) {
      onContinue(mapping, config);
    }
  };

  // Get available columns (excluding already mapped ones)
  const getAvailableColumns = (currentField: keyof ColumnMapping) => {
    const usedColumns = new Set(
      Object.entries(mapping)
        .filter(([key, value]) => key !== currentField && value !== null)
        .map(([, value]) => value)
    );
    return parsedCSV.headers.filter((h) => !usedColumns.has(h));
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">
        Map the columns from your CSV to the appropriate fields. The date column is required,
        and at least one reading type must be mapped.
      </p>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Date column mapping */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-500" />
            Date Column
            <span className="text-red-500">*</span>
          </Label>
          <Select
            value={mapping.date || UNMAPPED}
            onValueChange={(value) => handleMappingChange("date", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select date column" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNMAPPED}>-- Not mapped --</SelectItem>
              {getAvailableColumns("date").map((header) => (
                <SelectItem key={header} value={header}>
                  {header}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-500">
            The column containing date/time values
          </p>
        </div>

        {/* Spacer */}
        <div />

        {/* Meter reading mapping */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Droplets className="h-4 w-4 text-blue-500" />
            Meter Reading Column
          </Label>
          <Select
            value={mapping.meter || UNMAPPED}
            onValueChange={(value) => handleMappingChange("meter", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select column (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNMAPPED}>-- Not mapped --</SelectItem>
              {getAvailableColumns("meter").map((header) => (
                <SelectItem key={header} value={header}>
                  {header}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Target meter selector */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            Target Meter
            {mapping.meter && <span className="text-red-500">*</span>}
          </Label>
          <Select
            value={config.meterId || UNMAPPED}
            onValueChange={(value) => handleConfigChange("meterId", value)}
            disabled={!mapping.meter}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select meter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNMAPPED}>-- Not selected --</SelectItem>
              {meters.map((meter) => (
                <SelectItem key={meter.id} value={meter.id}>
                  {meter.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-500">
            Which meter these readings belong to
          </p>
        </div>

        {/* Chlorine reading mapping */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-green-500" />
            Chlorine Level Column
          </Label>
          <Select
            value={mapping.chlorine || UNMAPPED}
            onValueChange={(value) => handleMappingChange("chlorine", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select column (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNMAPPED}>-- Not mapped --</SelectItem>
              {getAvailableColumns("chlorine").map((header) => (
                <SelectItem key={header} value={header}>
                  {header}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-500">
            Chlorine readings don&apos;t require a target
          </p>
        </div>

        {/* Spacer for chlorine */}
        <div />

        {/* Reservoir reading mapping */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Waves className="h-4 w-4 text-cyan-500" />
            Reservoir Level Column
          </Label>
          <Select
            value={mapping.reservoir || UNMAPPED}
            onValueChange={(value) => handleMappingChange("reservoir", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select column (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNMAPPED}>-- Not mapped --</SelectItem>
              {getAvailableColumns("reservoir").map((header) => (
                <SelectItem key={header} value={header}>
                  {header}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Target reservoir selector */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            Target Reservoir
            {mapping.reservoir && <span className="text-red-500">*</span>}
          </Label>
          <Select
            value={config.reservoirId || UNMAPPED}
            onValueChange={(value) => handleConfigChange("reservoirId", value)}
            disabled={!mapping.reservoir}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select reservoir" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNMAPPED}>-- Not selected --</SelectItem>
              {reservoirs.map((reservoir) => (
                <SelectItem key={reservoir.id} value={reservoir.id}>
                  {reservoir.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-500">
            Which reservoir these readings belong to
          </p>
        </div>
      </div>

      {/* Preview of sample data */}
      <div className="rounded-lg border bg-slate-50 p-4">
        <h4 className="mb-2 text-sm font-medium text-slate-700">Sample Data Preview</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="px-2 py-1 text-left font-medium text-slate-600">Row</th>
                {mapping.date && (
                  <th className="px-2 py-1 text-left font-medium text-slate-600">Date</th>
                )}
                {mapping.meter && (
                  <th className="px-2 py-1 text-left font-medium text-slate-600">Meter</th>
                )}
                {mapping.chlorine && (
                  <th className="px-2 py-1 text-left font-medium text-slate-600">Chlorine</th>
                )}
                {mapping.reservoir && (
                  <th className="px-2 py-1 text-left font-medium text-slate-600">Reservoir</th>
                )}
              </tr>
            </thead>
            <tbody>
              {parsedCSV.rows.slice(0, 3).map((row, i) => {
                const dateIndex = mapping.date ? parsedCSV.headers.indexOf(mapping.date) : -1;
                const meterIndex = mapping.meter ? parsedCSV.headers.indexOf(mapping.meter) : -1;
                const chlorineIndex = mapping.chlorine ? parsedCSV.headers.indexOf(mapping.chlorine) : -1;
                const reservoirIndex = mapping.reservoir ? parsedCSV.headers.indexOf(mapping.reservoir) : -1;

                return (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-2 py-1 text-slate-400">{i + 1}</td>
                    {mapping.date && (
                      <td className="px-2 py-1 text-slate-700">{row[dateIndex] || "—"}</td>
                    )}
                    {mapping.meter && (
                      <td className="px-2 py-1 text-slate-700">{row[meterIndex] || "—"}</td>
                    )}
                    {mapping.chlorine && (
                      <td className="px-2 py-1 text-slate-700">{row[chlorineIndex] || "—"}</td>
                    )}
                    {mapping.reservoir && (
                      <td className="px-2 py-1 text-slate-700">{row[reservoirIndex] || "—"}</td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!mapping.date && !mapping.meter && !mapping.chlorine && !mapping.reservoir && (
          <p className="mt-2 text-xs text-slate-400 italic">
            Map columns above to see preview
          </p>
        )}
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
            <div>
              <p className="font-medium text-red-800">Please fix the following:</p>
              <ul className="mt-1 list-inside list-disc text-sm text-red-700">
                {errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleContinue}>Continue</Button>
      </div>
    </div>
  );
}
