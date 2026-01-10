"use client";

import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import type { ImportResult } from "@/lib/actions/readings-import";
import Link from "next/link";

interface ImportResultsProps {
  result: ImportResult;
  onImportAnother: () => void;
}

export function ImportResults({ result, onImportAnother }: ImportResultsProps) {
  const hasErrors = result.errors.length > 0;
  const totalProcessed = result.inserted + result.updated + result.skipped;
  const isSuccess = result.success && result.inserted + result.updated > 0;

  return (
    <div className="space-y-6">
      {/* Success/failure header */}
      {isSuccess ? (
        <div className="flex items-center gap-3 rounded-lg bg-green-50 p-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
          <div>
            <h3 className="font-semibold text-green-900">Import Successful</h3>
            <p className="text-sm text-green-700">
              Your readings have been imported to the database.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-lg bg-red-50 p-4">
          <XCircle className="h-8 w-8 text-red-600" />
          <div>
            <h3 className="font-semibold text-red-900">Import Failed</h3>
            <p className="text-sm text-red-700">
              There was an error importing your readings.
            </p>
          </div>
        </div>
      )}

      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {result.inserted > 0 && (
          <div className="rounded-lg border bg-green-50 p-4">
            <p className="text-sm font-medium text-green-800">Inserted</p>
            <p className="mt-1 text-3xl font-bold text-green-900">{result.inserted}</p>
            <p className="text-xs text-green-600">new readings</p>
          </div>
        )}

        {result.updated > 0 && (
          <div className="rounded-lg border bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-800">Updated</p>
            <p className="mt-1 text-3xl font-bold text-blue-900">{result.updated}</p>
            <p className="text-xs text-blue-600">existing readings</p>
          </div>
        )}

        {result.skipped > 0 && (
          <div className="rounded-lg border bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-700">Skipped</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{result.skipped}</p>
            <p className="text-xs text-slate-500">duplicate readings</p>
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
                {result.errors.length} error{result.errors.length !== 1 ? "s" : ""} occurred
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
                    {result.errors.slice(0, 10).map((error, i) => (
                      <tr key={i} className="border-b border-red-100 last:border-0">
                        <td className="py-1 pr-4 text-red-600">{error.row}</td>
                        <td className="py-1 text-red-700">{error.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {result.errors.length > 10 && (
                  <p className="mt-2 text-xs text-red-600">
                    ...and {result.errors.length - 10} more errors
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No data message */}
      {totalProcessed === 0 && !hasErrors && (
        <div className="rounded-lg border bg-slate-50 p-4 text-center">
          <p className="text-slate-600">No readings were imported.</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={onImportAnother}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Import Another File
        </Button>
        <Button asChild>
          <Link href="/dashboard/readings">
            View Readings
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
