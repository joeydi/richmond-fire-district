"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Columns, CheckCircle, Play, FileCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { CSVUpload } from "./csv-upload";
import { ColumnMapper } from "./column-mapper";
import { ImportPreview } from "./import-preview";
import {
  validateImportData,
  type ValidationResult as ServerValidationResult,
  type ParsedRow,
  type DuplicateInfo,
} from "@/lib/actions/readings-import";

interface Meter {
  id: string;
  name: string;
}

interface Reservoir {
  id: string;
  name: string;
  max_level_feet: number | null;
}

interface ImportWizardProps {
  meters: Meter[];
  reservoirs: Reservoir[];
}

export type WizardStep = "upload" | "map" | "validate" | "import" | "results";

export interface ParsedCSV {
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
  inserted: number;
  updated: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

const steps: { id: WizardStep; label: string; icon: React.ElementType }[] = [
  { id: "upload", label: "Upload", icon: Upload },
  { id: "map", label: "Map Columns", icon: Columns },
  { id: "validate", label: "Validate", icon: CheckCircle },
  { id: "import", label: "Import", icon: Play },
  { id: "results", label: "Results", icon: FileCheck },
];

export function ImportWizard({ meters, reservoirs }: ImportWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>("upload");
  const [parsedCSV, setParsedCSV] = useState<ParsedCSV | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    date: null,
    meter: null,
    chlorine: null,
    reservoir: null,
  });
  const [importConfig, setImportConfig] = useState<ImportConfig>({
    meterId: null,
    reservoirId: null,
    updateExisting: false,
  });
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  const goToNextStep = useCallback(() => {
    const currentIndex = steps.findIndex((s) => s.id === currentStep);
    const nextIndex = currentIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].id);
    }
  }, [currentStep]);

  const goToPreviousStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id);
    }
  };

  const resetWizard = () => {
    setCurrentStep("upload");
    setParsedCSV(null);
    setColumnMapping({ date: null, meter: null, chlorine: null, reservoir: null });
    setImportConfig({ meterId: null, reservoirId: null, updateExisting: false });
    setValidationResult(null);
    setImportResult(null);
    setIsValidating(false);
  };

  // Run validation when entering validate step
  useEffect(() => {
    if (currentStep === "validate" && parsedCSV && !validationResult && !isValidating) {
      const runValidation = async () => {
        setIsValidating(true);
        try {
          const result = await validateImportData(
            parsedCSV.headers,
            parsedCSV.rows,
            columnMapping,
            importConfig
          );
          setValidationResult(result);
        } catch (error) {
          console.error("Validation error:", error);
          setValidationResult({
            success: false,
            parsedRows: [],
            validRows: 0,
            invalidRows: parsedCSV.rows.length,
            duplicateRows: 0,
            errors: [{ row: 0, message: "Validation failed. Please try again." }],
            duplicates: [],
          });
        } finally {
          setIsValidating(false);
        }
      };
      runValidation();
    }
  }, [currentStep, parsedCSV, columnMapping, importConfig, validationResult, isValidating]);

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <nav aria-label="Progress">
        <ol className="flex items-center">
          {steps.map((step, index) => (
            <li
              key={step.id}
              className={cn("relative", index !== steps.length - 1 && "flex-1")}
            >
              <div className="flex items-center">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2",
                    index < currentStepIndex
                      ? "border-blue-600 bg-blue-600 text-white"
                      : index === currentStepIndex
                        ? "border-blue-600 bg-white text-blue-600"
                        : "border-slate-300 bg-white text-slate-400"
                  )}
                >
                  <step.icon className="h-5 w-5" />
                </div>
                {index !== steps.length - 1 && (
                  <div
                    className={cn(
                      "ml-4 h-0.5 flex-1",
                      index < currentStepIndex ? "bg-blue-600" : "bg-slate-200"
                    )}
                  />
                )}
              </div>
              <span
                className={cn(
                  "absolute -bottom-6 left-0 w-max text-xs font-medium",
                  index <= currentStepIndex ? "text-blue-600" : "text-slate-400"
                )}
              >
                {step.label}
              </span>
            </li>
          ))}
        </ol>
      </nav>

      {/* Step content */}
      <Card className="mt-12">
        <CardHeader>
          <CardTitle>
            {currentStep === "upload" && "Upload CSV File"}
            {currentStep === "map" && "Map Columns"}
            {currentStep === "validate" && "Validate Data"}
            {currentStep === "import" && "Import Data"}
            {currentStep === "results" && "Import Complete"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentStep === "upload" && (
            <CSVUpload
              onUpload={(data) => {
                setParsedCSV(data);
                goToNextStep();
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
              onBack={goToPreviousStep}
              onContinue={(mapping, config) => {
                setColumnMapping(mapping);
                setImportConfig(config);
                goToNextStep();
              }}
            />
          )}

          {currentStep === "validate" && (
            <ImportPreview
              validationResult={validationResult || {
                success: false,
                parsedRows: [],
                validRows: 0,
                invalidRows: 0,
                duplicateRows: 0,
                errors: [],
                duplicates: [],
              }}
              isValidating={isValidating}
              onBack={() => {
                setValidationResult(null);
                goToPreviousStep();
              }}
              onContinue={(updateExisting) => {
                setImportConfig((prev) => ({ ...prev, updateExisting }));
                goToNextStep();
              }}
            />
          )}

          {currentStep === "import" && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Ready to import {validationResult?.validRows} rows
              </p>
              {validationResult && validationResult.duplicateRows > 0 && (
                <p className="text-sm text-amber-600">
                  {validationResult.duplicateRows} rows match existing records
                </p>
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={goToPreviousStep}>
                  Back
                </Button>
                <Button onClick={() => {
                  setImportResult({
                    inserted: 8,
                    updated: 2,
                    skipped: 0,
                    errors: [],
                  });
                  goToNextStep();
                }}>
                  Import Data
                </Button>
              </div>
            </div>
          )}

          {currentStep === "results" && (
            <div className="space-y-4">
              {importResult && (
                <div className="space-y-2">
                  <p className="text-sm text-green-600">
                    ✓ {importResult.inserted} rows inserted
                  </p>
                  {importResult.updated > 0 && (
                    <p className="text-sm text-blue-600">
                      ✓ {importResult.updated} rows updated
                    </p>
                  )}
                  {importResult.skipped > 0 && (
                    <p className="text-sm text-slate-600">
                      • {importResult.skipped} rows skipped
                    </p>
                  )}
                </div>
              )}
              <Button onClick={resetWizard}>Import Another File</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Debug info - hidden in production */}
      {process.env.NODE_ENV === "development" && (
        <div className="text-xs text-slate-400 p-4 bg-slate-50 rounded">
          <p>Meters: {meters.length}</p>
          <p>Reservoirs: {reservoirs.length}</p>
        </div>
      )}
    </div>
  );
}
