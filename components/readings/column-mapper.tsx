"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ParsedCSV, ColumnMapping, ImportConfig } from "./import-wizard";
import { StepFooter, StepTable, labelClass, tdClass, thClass } from "./import-ui";

interface Meter {
  id: string;
  name: string;
}

interface Reservoir {
  id: string;
  name: string;
  max_level_inches: number | null;
}

interface ColumnMapperProps {
  parsedCSV: ParsedCSV;
  meters: Meter[];
  reservoirs: Reservoir[];
  initialMapping: ColumnMapping;
  initialConfig: ImportConfig;
  onBack: () => void;
  onContinue: (mapping: ColumnMapping, config: ImportConfig) => void;
}

const UNMAPPED = "__unmapped__";
const SAMPLE_ROWS = 3;

const FIELDS: { key: keyof ColumnMapping; label: string; keywords: string[] }[] = [
  { key: "date", label: "Date", keywords: ["date", "time", "timestamp", "recorded"] },
  { key: "meter", label: "Meter", keywords: ["meter", "gallons", "totalizer"] },
  { key: "chlorine", label: "Chlorine", keywords: ["chlorine", "cl2", "residual"] },
  { key: "reservoir", label: "Reservoir", keywords: ["reservoir", "tank", "level"] },
];

/** Guess each field's column from its header; the first matching unused column wins */
function detectMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = { date: null, meter: null, chlorine: null, reservoir: null };
  const used = new Set<string>();
  for (const field of FIELDS) {
    const match = headers.find((h) => !used.has(h) && field.keywords.some((k) => h.toLowerCase().includes(k)));
    if (match) {
      mapping[field.key] = match;
      used.add(match);
    }
  }
  return mapping;
}

const triggerClass = "!h-8 w-full px-2 text-[13px]";

export function ColumnMapper({
  parsedCSV,
  meters,
  reservoirs,
  initialMapping,
  initialConfig,
  onBack,
  onContinue,
}: ColumnMapperProps) {
  const isFresh = Object.values(initialMapping).every((v) => v === null);
  const [mapping, setMapping] = useState<ColumnMapping>(() =>
    isFresh ? detectMapping(parsedCSV.headers) : initialMapping
  );
  const [config, setConfig] = useState<ImportConfig>(() => ({
    ...initialConfig,
    // With a single meter or reservoir there's nothing to choose
    meterId: initialConfig.meterId ?? (meters.length === 1 ? meters[0].id : null),
    reservoirId: initialConfig.reservoirId ?? (reservoirs.length === 1 ? reservoirs[0].id : null),
  }));
  const [errors, setErrors] = useState<string[]>([]);

  const setColumn = (field: keyof ColumnMapping, value: string) => {
    setMapping((prev) => ({ ...prev, [field]: value === UNMAPPED ? null : value }));
    setErrors([]);
  };

  const setTarget = (field: "meterId" | "reservoirId", value: string) => {
    setConfig((prev) => ({ ...prev, [field]: value === UNMAPPED ? null : value }));
    setErrors([]);
  };

  const handleContinue = () => {
    const newErrors: string[] = [];
    if (!mapping.date) newErrors.push("Choose the column that holds the date");
    if (!mapping.meter && !mapping.chlorine && !mapping.reservoir) {
      newErrors.push("Map at least one reading column: meter, chlorine or reservoir");
    }
    if (mapping.meter && !config.meterId) newErrors.push("Choose which meter the meter readings belong to");
    if (mapping.reservoir && !config.reservoirId) {
      newErrors.push("Choose which reservoir the reservoir readings belong to");
    }
    setErrors(newErrors);
    if (newErrors.length === 0) onContinue(mapping, config);
  };

  // Columns not already taken by another field
  const availableColumns = (field: keyof ColumnMapping) => {
    const used = new Set(
      Object.entries(mapping)
        .filter(([key, value]) => key !== field && value !== null)
        .map(([, value]) => value)
    );
    return parsedCSV.headers.filter((h) => h && !used.has(h));
  };

  const columnSelect = (field: keyof ColumnMapping, label: string) => (
    <Select value={mapping[field] ?? UNMAPPED} onValueChange={(value) => setColumn(field, value)}>
      <SelectTrigger size="sm" className={triggerClass} aria-label={`${label} column`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNMAPPED}>
          <span className="text-muted-foreground">Not in this file</span>
        </SelectItem>
        {availableColumns(field).map((header) => (
          <SelectItem key={header} value={header}>
            {header}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const targetSelect = (
    field: "meterId" | "reservoirId",
    label: string,
    options: { id: string; name: string }[],
    enabled: boolean
  ) => (
    <Select value={config[field] ?? UNMAPPED} onValueChange={(value) => setTarget(field, value)} disabled={!enabled}>
      <SelectTrigger size="sm" className={triggerClass} aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNMAPPED}>
          <span className="text-muted-foreground">Choose…</span>
        </SelectItem>
        {options.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            {option.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const targets: Record<keyof ColumnMapping, React.ReactNode> = {
    date: <span className="text-xs text-muted-foreground">Required</span>,
    meter: targetSelect("meterId", "Target meter", meters, !!mapping.meter),
    chlorine: <span className="text-xs text-muted-foreground">Chlorine log</span>,
    reservoir: targetSelect("reservoirId", "Target reservoir", reservoirs, !!mapping.reservoir),
  };

  const mappedFields = FIELDS.filter((f) => mapping[f.key]);

  return (
    <>
      <div className="flex flex-col gap-5 p-4">
        <section>
          <div className="hidden grid-cols-[96px_1fr_1fr] gap-3 pb-1.5 sm:grid">
            <span className={labelClass}>Field</span>
            <span className={labelClass}>CSV column</span>
            <span className={labelClass}>Save to</span>
          </div>
          <div className="divide-y border-y">
            {FIELDS.map((field) => (
              <div
                key={field.key}
                className="grid grid-cols-2 items-center gap-x-3 gap-y-1.5 py-2 sm:grid-cols-[96px_1fr_1fr]"
              >
                <span className="col-span-2 text-[13px] font-medium sm:col-span-1">
                  {field.label}
                  {field.key === "date" && <span className="text-red-600"> *</span>}
                </span>
                {columnSelect(field.key, field.label)}
                <div className="flex min-h-8 items-center">{targets[field.key]}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className={labelClass}>Sample · first {SAMPLE_ROWS} rows as mapped</h3>
          {mappedFields.length > 0 ? (
            <StepTable>
              <thead>
                <tr>
                  <th className={cn(thClass, "w-12")}>Row</th>
                  {mappedFields.map((f) => (
                    <th key={f.key} className={thClass}>
                      {f.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsedCSV.rows.slice(0, SAMPLE_ROWS).map((row, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className={cn(tdClass, "font-mono text-muted-foreground")}>{i + 2}</td>
                    {mappedFields.map((f) => {
                      const value = row[parsedCSV.headers.indexOf(mapping[f.key]!)];
                      return (
                        <td key={f.key} className={cn(tdClass, "font-mono text-zinc-700")}>
                          {value || <span className="text-muted-foreground">—</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </StepTable>
          ) : (
            <p className="rounded-md border border-dashed px-4 py-6 text-center text-xs text-muted-foreground">
              Map a column to see it here
            </p>
          )}
        </section>

        {errors.length > 0 && (
          <ul role="alert" className="flex flex-col gap-1">
            {errors.map((error) => (
              <li key={error} className="flex items-center gap-2 text-xs text-red-600">
                <AlertCircle className="size-3.5 shrink-0" />
                {error}
              </li>
            ))}
          </ul>
        )}
      </div>

      <StepFooter hint="ROW NUMBERS MATCH THE FILE · ROW 1 IS THE HEADER">
        <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs" onClick={onBack}>
          Back
        </Button>
        <Button size="sm" className="h-7 px-2.5 text-xs" onClick={handleContinue}>
          Check rows
        </Button>
      </StepFooter>
    </>
  );
}
