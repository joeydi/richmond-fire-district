"use client";

import { useCallback, useState } from "react";
import { Upload, FileSpreadsheet, X, AlertCircle } from "lucide-react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ParsedCSV } from "./import-wizard";

interface CSVUploadProps {
  onUpload: (data: ParsedCSV) => void;
}

export function CSVUpload({ onUpload }: CSVUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ParsedCSV | null>(null);

  const parseCSV = useCallback((file: File) => {
    setError(null);

    Papa.parse(file, {
      complete: (results) => {
        if (results.errors.length > 0) {
          setError(`Parse error: ${results.errors[0].message}`);
          return;
        }

        const data = results.data as string[][];

        if (data.length < 2) {
          setError("CSV must have at least a header row and one data row");
          return;
        }

        // Filter out empty rows
        const filteredData = data.filter(row => row.some(cell => cell.trim() !== ""));

        if (filteredData.length < 2) {
          setError("CSV must have at least a header row and one data row");
          return;
        }

        const headers = filteredData[0];
        const rows = filteredData.slice(1);

        const parsed: ParsedCSV = { headers, rows };
        setPreview(parsed);
        setFile(file);
      },
      error: (err) => {
        setError(`Failed to parse CSV: ${err.message}`);
      },
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (!droppedFile) return;

    if (!droppedFile.name.endsWith(".csv")) {
      setError("Please upload a CSV file");
      return;
    }

    parseCSV(droppedFile);
  }, [parseCSV]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".csv")) {
      setError("Please upload a CSV file");
      return;
    }

    parseCSV(selectedFile);
  }, [parseCSV]);

  const handleClear = useCallback(() => {
    setFile(null);
    setPreview(null);
    setError(null);
  }, []);

  const handleContinue = useCallback(() => {
    if (preview) {
      onUpload(preview);
    }
  }, [preview, onUpload]);

  if (preview && file) {
    return (
      <div className="space-y-4">
        {/* File info */}
        <div className="flex items-center justify-between rounded-lg border bg-slate-50 p-4">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-8 w-8 text-green-600" />
            <div>
              <p className="font-medium text-slate-900">{file.name}</p>
              <p className="text-sm text-slate-500">
                {preview.headers.length} columns, {preview.rows.length} rows
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClear}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Preview table */}
        <div className="rounded-lg border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  {preview.headers.map((header, i) => (
                    <th
                      key={i}
                      className="whitespace-nowrap px-4 py-2 text-left font-medium text-slate-700"
                    >
                      {header || `Column ${i + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, 5).map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b last:border-0">
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className="whitespace-nowrap px-4 py-2 text-slate-600"
                      >
                        {cell || <span className="text-slate-300">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.rows.length > 5 && (
            <div className="border-t bg-slate-50 px-4 py-2 text-center text-sm text-slate-500">
              Showing 5 of {preview.rows.length} rows
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={handleContinue}>Continue</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className={cn(
          "relative rounded-lg border-2 border-dashed p-12 text-center transition-colors",
          isDragging
            ? "border-blue-400 bg-blue-50"
            : "border-slate-300 hover:border-slate-400"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
        <Upload
          className={cn(
            "mx-auto h-12 w-12",
            isDragging ? "text-blue-500" : "text-slate-400"
          )}
        />
        <p className="mt-4 text-sm font-medium text-slate-700">
          {isDragging ? "Drop your CSV file here" : "Drag and drop your CSV file here"}
        </p>
        <p className="mt-1 text-xs text-slate-500">or click to browse</p>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
