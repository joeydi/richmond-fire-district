"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { getLogDateParts } from "@/components/log/log-dates";
import type { ParsedRow } from "@/lib/actions/readings-import";
import type { ColumnMapping, ValidationResult } from "./import-wizard";
import { RowErrors, StatStrip, StepFooter, StepTable, labelClass, tdClass, thClass } from "./import-ui";

const PREVIEW_ROWS = 50;

const VALUE_COLUMNS: {
  key: "meter" | "chlorine" | "reservoir";
  label: string;
  value: (row: ParsedRow) => number | null;
}[] = [
  { key: "meter", label: "Meter", value: (row) => row.meterValue },
  { key: "chlorine", label: "Chlorine", value: (row) => row.chlorineValue },
  { key: "reservoir", label: "Reservoir", value: (row) => row.reservoirValue },
];

interface ImportPreviewProps {
  /** Null while validation runs */
  validationResult: ValidationResult | null;
  rowCount: number;
  mapping: ColumnMapping;
  isImporting: boolean;
  initialUpdateExisting: boolean;
  onBack: () => void;
  onImport: (updateExisting: boolean) => void;
}

function DistrictDate({ date }: { date: Date | string }) {
  const { date: day, time } = getLogDateParts(new Date(date).toISOString());
  return (
    <>
      {day} <span className="text-muted-foreground">{time}</span>
    </>
  );
}

export function ImportPreview({
  validationResult,
  rowCount,
  mapping,
  isImporting,
  initialUpdateExisting,
  onBack,
  onImport,
}: ImportPreviewProps) {
  const [updateExisting, setUpdateExisting] = useState(initialUpdateExisting);

  if (!validationResult) {
    return (
      <>
        <div className="flex items-center justify-center gap-2 px-4 py-16 font-mono text-[11px] text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          CHECKING {rowCount.toLocaleString()} {rowCount === 1 ? "ROW" : "ROWS"}…
        </div>
        <StepFooter>
          <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs" onClick={onBack}>
            Back
          </Button>
        </StepFooter>
      </>
    );
  }

  const { validRows, invalidRows, duplicateRows, parsedRows, errors, duplicates } = validationResult;
  const canImport = validRows > 0;
  const columns = VALUE_COLUMNS.filter((c) => mapping[c.key]);

  return (
    <>
      <div className="flex flex-col gap-5 p-4">
        <StatStrip
          stats={[
            { label: "Valid rows", value: validRows, tone: "good" },
            { label: "Already recorded", value: duplicateRows, tone: "warning" },
            { label: "Can't read", value: invalidRows, tone: "critical" },
          ]}
        />

        <RowErrors title="Can't read" errors={errors} />

        {duplicates.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className={cn(labelClass, "text-amber-700")}>
              Already recorded · {duplicates.length} {duplicates.length === 1 ? "reading" : "readings"}
            </h3>
            <StepTable className="max-h-48">
              <thead>
                <tr>
                  <th className={cn(thClass, "w-16")}>Row</th>
                  <th className={thClass}>Date</th>
                  <th className={thClass}>Reading</th>
                </tr>
              </thead>
              <tbody>
                {duplicates.map((dup, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className={cn(tdClass, "font-mono text-muted-foreground")}>{dup.row}</td>
                    <td className={cn(tdClass, "font-mono text-zinc-700")}>
                      <DistrictDate date={dup.date} />
                    </td>
                    <td className={cn(tdClass, "text-zinc-700 capitalize")}>{dup.type}</td>
                  </tr>
                ))}
              </tbody>
            </StepTable>
            <label className="flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2.5">
              <Checkbox
                checked={updateExisting}
                onCheckedChange={(checked) => setUpdateExisting(checked === true)}
                className="mt-0.5"
              />
              <span className="flex flex-col gap-0.5">
                <span className="text-[13px] font-medium">Overwrite existing readings</span>
                <span className="text-xs text-muted-foreground">
                  {updateExisting
                    ? "These readings will be replaced with the values in this file."
                    : "These readings will be skipped and the existing values kept."}
                </span>
              </span>
            </label>
          </section>
        )}

        {parsedRows.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className={labelClass}>
              To import
              {parsedRows.length > PREVIEW_ROWS && ` · first ${PREVIEW_ROWS} of ${parsedRows.length.toLocaleString()}`}
            </h3>
            <StepTable>
              <thead>
                <tr>
                  <th className={cn(thClass, "w-16")}>Row</th>
                  <th className={thClass}>Date</th>
                  {columns.map((c) => (
                    <th key={c.key} className={cn(thClass, "text-right")}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsedRows.slice(0, PREVIEW_ROWS).map((row) => (
                  <tr key={row.rowIndex} className="border-b last:border-0">
                    <td className={cn(tdClass, "font-mono text-muted-foreground")}>{row.rowIndex}</td>
                    <td className={cn(tdClass, "font-mono text-zinc-700")}>
                      <DistrictDate date={row.date} />
                    </td>
                    {columns.map((c) => {
                      const value = c.value(row);
                      return (
                        <td key={c.key} className={cn(tdClass, "text-right font-mono text-zinc-700")}>
                          {value === null ? <span className="text-muted-foreground">—</span> : value.toLocaleString()}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </StepTable>
          </section>
        )}

        {!canImport && (
          <p className="rounded-md border border-dashed px-4 py-6 text-center text-xs text-muted-foreground">
            No rows can be imported. Go back and check the column mapping, or fix the file and upload it again.
          </p>
        )}
      </div>

      <StepFooter
        hint={
          duplicateRows > 0
            ? `${duplicateRows.toLocaleString()} ALREADY RECORDED WILL BE ${updateExisting ? "OVERWRITTEN" : "SKIPPED"}`
            : undefined
        }
      >
        <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs" onClick={onBack} disabled={isImporting}>
          Back
        </Button>
        <Button
          size="sm"
          className="h-7 px-2.5 text-xs"
          onClick={() => onImport(updateExisting)}
          disabled={!canImport || isImporting}
        >
          {isImporting && <Loader2 className="size-3.5 animate-spin" />}
          {isImporting ? "Importing…" : `Import ${validRows.toLocaleString()} ${validRows === 1 ? "row" : "rows"}`}
        </Button>
      </StepFooter>
    </>
  );
}
