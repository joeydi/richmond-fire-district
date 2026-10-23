"use client";

import { useRef, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { CSVUpload } from "./csv-upload";
import { ColumnMapper } from "./column-mapper";
import { ImportPreview } from "./import-preview";
import { validateImportData, executeImport, type ParsedRow, type DuplicateInfo } from "@/lib/actions/readings-import";
import { ImportResults } from "./import-results";

interface Meter {
  id: string;
  name: string;
}

interface Reservoir {
  id: string;
  name: string;
  max_level_inches: number | null;
}

interface ImportWizardProps {
  meters: Meter[];
  reservoirs: Reservoir[];
}

export type WizardStep = "upload" | "map" | "review" | "done";

export interface ParsedCSV {
  fileName: string;
  headers: string[];
  rows: string[][];
}

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

export interface ValidationResult {
  success: boolean;
  parsedRows: ParsedRow[];
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  errors: { row: number; message: string }[];
  duplicates: DuplicateInfo[];
}

export interface ImportResult {
  success: boolean;
  inserted: number;
  updated: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

const steps: { id: WizardStep; label: string }[] = [
  { id: "upload", label: "Upload" },
  { id: "map", label: "Map columns" },
  { id: "review", label: "Review" },
  { id: "done", label: "Done" },
];

const EMPTY_MAPPING: ColumnMapping = { date: null, meter: null, chlorine: null, reservoir: null };
const EMPTY_CONFIG: ImportConfig = { meterId: null, reservoirId: null, updateExisting: false };

function Stepper({ current }: { current: WizardStep }) {
  const currentIndex = steps.findIndex((s) => s.id === current);
  return (
    <nav aria-label="Import progress">
      <ol className="flex items-center gap-1.5 font-mono text-[11px] uppercase">
        {steps.map((step, index) => {
          const done = index < currentIndex;
          const active = index === currentIndex;
          return (
            <li key={step.id} className="flex items-center gap-1.5">
              {index > 0 && <span aria-hidden="true" className="h-px w-3 bg-border sm:w-5" />}
              <span
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex items-center gap-1.5",
                  active ? "font-medium text-foreground" : done ? "text-zinc-600" : "text-muted-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex size-4 items-center justify-center rounded-full border text-[9px]",
                    active && "border-foreground bg-foreground text-background",
                    done && "border-brand bg-brand text-white"
                  )}
                >
                  {done ? <Check className="size-2.5" strokeWidth={3} /> : index + 1}
                </span>
                <span className={cn(!active && "hidden sm:inline")}>{step.label}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function ImportWizard({ meters, reservoirs }: ImportWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>("upload");
  const [parsedCSV, setParsedCSV] = useState<ParsedCSV | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>(EMPTY_MAPPING);
  const [importConfig, setImportConfig] = useState<ImportConfig>(EMPTY_CONFIG);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  // Ignores a validation that finishes after the user has gone back
  const validationRun = useRef(0);

  const resetWizard = () => {
    validationRun.current++;
    setCurrentStep("upload");
    setParsedCSV(null);
    setColumnMapping(EMPTY_MAPPING);
    setImportConfig(EMPTY_CONFIG);
    setValidationResult(null);
    setImportResult(null);
    setIsImporting(false);
  };

  const runValidation = async (csv: ParsedCSV, mapping: ColumnMapping, config: ImportConfig) => {
    const run = ++validationRun.current;
    setValidationResult(null);
    let result: ValidationResult;
    try {
      result = await validateImportData(csv.headers, csv.rows, mapping, config);
    } catch (error) {
      console.error("Validation error:", error);
      result = {
        success: false,
        parsedRows: [],
        validRows: 0,
        invalidRows: csv.rows.length,
        duplicateRows: 0,
        errors: [{ row: 0, message: "Validation failed. Please try again." }],
        duplicates: [],
      };
    }
    if (run === validationRun.current) setValidationResult(result);
  };

  const runImport = async (updateExisting: boolean) => {
    if (!validationResult || validationResult.parsedRows.length === 0) return;
    const config = { ...importConfig, updateExisting };
    setImportConfig(config);
    setIsImporting(true);
    try {
      setImportResult(
        await executeImport(validationResult.parsedRows, columnMapping, config, validationResult.duplicates)
      );
    } catch (error) {
      console.error("Import error:", error);
      setImportResult({
        success: false,
        inserted: 0,
        updated: 0,
        skipped: 0,
        errors: [{ row: 0, message: "Import failed. Please try again." }],
      });
    } finally {
      setIsImporting(false);
      setCurrentStep("done");
    }
  };

  return (
    <div data-bleed className="flex flex-1 flex-col">
      <div className="flex min-h-9 flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-1.5">
        <h2 className="text-[13px] font-semibold">Import CSV</h2>
        {parsedCSV && (
          <span className="min-w-0 truncate font-mono text-[11px] text-muted-foreground">{parsedCSV.fileName}</span>
        )}
        <div className="ml-auto">
          <Stepper current={currentStep} />
        </div>
      </div>

      <div className="flex-1 border-t bg-zinc-50/60 p-4 lg:p-6">
        <div className="mx-auto max-w-3xl overflow-hidden rounded-lg border bg-background shadow-xs">
          {currentStep === "upload" && (
            <CSVUpload
              initial={parsedCSV}
              onUpload={(data) => {
                // A different file invalidates the old column choices
                if (data !== parsedCSV) {
                  setColumnMapping(EMPTY_MAPPING);
                  setImportConfig(EMPTY_CONFIG);
                }
                setParsedCSV(data);
                setCurrentStep("map");
              }}
            />
          )}

          {currentStep === "map" && parsedCSV && (
            <ColumnMapper
              parsedCSV={parsedCSV}
              meters={meters}
              reservoirs={reservoirs}
              initialMapping={columnMapping}
              initialConfig={importConfig}
              onBack={() => setCurrentStep("upload")}
              onContinue={(mapping, config) => {
                setColumnMapping(mapping);
                setImportConfig(config);
                setCurrentStep("review");
                runValidation(parsedCSV, mapping, config);
              }}
            />
          )}

          {currentStep === "review" && parsedCSV && (
            <ImportPreview
              validationResult={validationResult}
              rowCount={parsedCSV.rows.length}
              mapping={columnMapping}
              isImporting={isImporting}
              initialUpdateExisting={importConfig.updateExisting}
              onBack={() => {
                validationRun.current++;
                setValidationResult(null);
                setCurrentStep("map");
              }}
              onImport={runImport}
            />
          )}

          {currentStep === "done" && importResult && (
            <ImportResults result={importResult} mapping={columnMapping} onImportAnother={resetWizard} />
          )}
        </div>
      </div>
    </div>
  );
}
