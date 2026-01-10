"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import type { ValidationResult, DuplicateInfo, ParseError } from "@/lib/actions/readings-import";
import { format } from "date-fns";

interface ImportPreviewProps {
  validationResult: ValidationResult;
  onBack: () => void;
  onContinue: (updateExisting: boolean) => void;
  isValidating?: boolean;
}

export function ImportPreview({
  validationResult,
  onBack,
  onContinue,
  isValidating = false,
}: ImportPreviewProps) {
  const [updateExisting, setUpdateExisting] = useState(false);

  const hasErrors = validationResult.errors.length > 0;
  const hasDuplicates = validationResult.duplicateRows > 0;
  const canProceed = validationResult.validRows > 0;

  return (
    <div className="space-y-6">
      {isValidating ? (
        <div className="flex items-center justify-center py-12">
          <Clock className="mr-2 h-5 w-5 animate-spin text-blue-500" />
          <span className="text-slate-600">Validating data...</span>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border bg-green-50 p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-800">Valid Rows</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-green-900">
                {validationResult.validRows}
              </p>
            </div>

            {hasErrors && (
              <div className="rounded-lg border bg-red-50 p-4">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span className="text-sm font-medium text-red-800">Invalid Rows</span>
                </div>
                <p className="mt-1 text-2xl font-bold text-red-900">
                  {validationResult.invalidRows}
                </p>
              </div>
            )}

            {hasDuplicates && (
              <div className="rounded-lg border bg-amber-50 p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <span className="text-sm font-medium text-amber-800">Duplicates</span>
                </div>
                <p className="mt-1 text-2xl font-bold text-amber-900">
                  {validationResult.duplicateRows}
                </p>
              </div>
            )}
          </div>

          {/* Errors list */}
          {hasErrors && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
                <div className="flex-1">
                  <p className="font-medium text-red-800">
                    {validationResult.errors.length} row{validationResult.errors.length !== 1 ? "s" : ""} could not be parsed
                  </p>
                  <div className="mt-2 max-h-40 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-red-200">
                          <th className="pb-1 pr-4 text-left font-medium text-red-700">Row</th>
                          <th className="pb-1 text-left font-medium text-red-700">Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {validationResult.errors.slice(0, 10).map((error, i) => (
                          <tr key={i} className="border-b border-red-100 last:border-0">
                            <td className="py-1 pr-4 text-red-600">{error.row}</td>
                            <td className="py-1 text-red-700">{error.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {validationResult.errors.length > 10 && (
                      <p className="mt-2 text-xs text-red-600">
                        ...and {validationResult.errors.length - 10} more errors
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Duplicates warning */}
          {hasDuplicates && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-500" />
                <div className="flex-1">
                  <p className="font-medium text-amber-800">
                    {validationResult.duplicateRows} row{validationResult.duplicateRows !== 1 ? "s" : ""} match existing records
                  </p>
                  <p className="mt-1 text-sm text-amber-700">
                    These dates already have readings in the database.
                  </p>
                  <div className="mt-2 max-h-40 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-amber-200">
                          <th className="pb-1 pr-4 text-left font-medium text-amber-700">Row</th>
                          <th className="pb-1 pr-4 text-left font-medium text-amber-700">Date</th>
                          <th className="pb-1 text-left font-medium text-amber-700">Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {validationResult.duplicates.slice(0, 10).map((dup, i) => (
                          <tr key={i} className="border-b border-amber-100 last:border-0">
                            <td className="py-1 pr-4 text-amber-600">{dup.row}</td>
                            <td className="py-1 pr-4 text-amber-700">
                              {format(new Date(dup.date), "MMM d, yyyy h:mm a")}
                            </td>
                            <td className="py-1 capitalize text-amber-700">{dup.type}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {validationResult.duplicates.length > 10 && (
                      <p className="mt-2 text-xs text-amber-600">
                        ...and {validationResult.duplicates.length - 10} more duplicates
                      </p>
                    )}
                  </div>

                  {/* Update option */}
                  <div className="mt-4 flex items-center space-x-2">
                    <Checkbox
                      id="updateExisting"
                      checked={updateExisting}
                      onCheckedChange={(checked) => setUpdateExisting(checked === true)}
                    />
                    <Label
                      htmlFor="updateExisting"
                      className="text-sm font-medium text-amber-800 cursor-pointer"
                    >
                      Update existing records with new values
                    </Label>
                  </div>
                  <p className="mt-1 ml-6 text-xs text-amber-600">
                    {updateExisting
                      ? "Existing records will be updated with the values from your CSV"
                      : "Duplicate rows will be skipped (existing records preserved)"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Success message when no issues */}
          {!hasErrors && !hasDuplicates && canProceed && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <p className="font-medium text-green-800">
                  All {validationResult.validRows} rows validated successfully
                </p>
              </div>
              <p className="mt-1 ml-7 text-sm text-green-700">
                Ready to import. No issues detected.
              </p>
            </div>
          )}

          {/* No valid rows error */}
          {!canProceed && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <p className="font-medium text-red-800">No valid rows to import</p>
              </div>
              <p className="mt-1 ml-7 text-sm text-red-700">
                Please fix the errors above and try again.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onBack}>
              Back
            </Button>
            <Button onClick={() => onContinue(updateExisting)} disabled={!canProceed}>
              {canProceed
                ? `Import ${validationResult.validRows} Row${validationResult.validRows !== 1 ? "s" : ""}`
                : "Cannot Import"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
