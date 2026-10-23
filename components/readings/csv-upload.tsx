"use client";

import { useCallback, useState } from "react";
import { Upload, FileSpreadsheet, X, AlertCircle } from "lucide-react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ParsedCSV } from "./import-wizard";
import { StepFooter, StepTable, tdClass, thClass } from "./import-ui";

const PREVIEW_ROWS = 5;

interface CSVUploadProps {
  /** The file already chosen, when coming back from a later step */
  initial: ParsedCSV | null;
  onUpload: (data: ParsedCSV) => void;
}

export function CSVUpload({ initial, onUpload }: CSVUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ParsedCSV | null>(initial);

  const parseCSV = useCallback((file: File) => {
    setError(null);

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Choose a .csv file");
      return;
    }

    Papa.parse<string[]>(file, {
      complete: (results) => {
        if (results.errors.length > 0) {
          setError(`Parse error: ${results.errors[0].message}`);
          return;
        }

        // Filter out empty rows
        const filteredData = results.data.filter((row) => row.some((cell) => cell.trim() !== ""));

        if (filteredData.length < 2) {
          setError("The file needs a header row and at least one data row");
          return;
        }

        setPreview({ fileName: file.name, headers: filteredData[0], rows: filteredData.slice(1) });
      },
      error: (err) => {
        setError(`Could not read the file: ${err.message}`);
      },
    });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) parseCSV(droppedFile);
    },
    [parseCSV]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      // Reset so choosing the same file again still fires change
      e.target.value = "";
      if (selectedFile) parseCSV(selectedFile);
    },
    [parseCSV]
  );

  if (preview) {
    return (
      <>
        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-center gap-3 rounded-md border px-3 py-2">
            <FileSpreadsheet className="size-4 shrink-0 text-emerald-600" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">{preview.fileName}</p>
              <p className="font-mono text-[11px] text-muted-foreground">
                {preview.headers.length} COLUMNS · {preview.rows.length.toLocaleString()}{" "}
                {preview.rows.length === 1 ? "ROW" : "ROWS"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => setPreview(null)}
              aria-label="Choose a different file"
            >
              <X className="size-4" />
            </Button>
          </div>

          <StepTable>
            <thead>
              <tr>
                {preview.headers.map((header, i) => (
                  <th key={i} className={thClass}>
                    {header || `Column ${i + 1}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.rows.slice(0, PREVIEW_ROWS).map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b last:border-0">
                  {preview.headers.map((_, cellIndex) => (
                    <td key={cellIndex} className={cn(tdClass, "font-mono text-zinc-700")}>
                      {row[cellIndex] || <span className="text-muted-foreground">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </StepTable>
        </div>

        <StepFooter
          hint={
            preview.rows.length > PREVIEW_ROWS
              ? `FIRST ${PREVIEW_ROWS} OF ${preview.rows.length.toLocaleString()} ROWS`
              : undefined
          }
        >
          <Button size="sm" className="h-7 px-2.5 text-xs" onClick={() => onUpload(preview)}>
            Continue
          </Button>
        </StepFooter>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <label
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed px-4 py-14 text-center transition-colors",
          "focus-within:border-brand focus-within:ring-[3px] focus-within:ring-brand/20",
          isDragging ? "border-brand bg-brand/5" : "border-zinc-300 hover:border-zinc-400 hover:bg-zinc-50"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onDrop={handleDrop}
      >
        <input type="file" accept=".csv,text/csv" onChange={handleFileSelect} className="sr-only" />
        <Upload className={cn("size-5", isDragging ? "text-brand" : "text-muted-foreground")} />
        <span className="text-[13px] font-medium">
          {isDragging ? (
            "Drop to read the file"
          ) : (
            <>
              Drop a CSV here or <span className="text-brand underline underline-offset-2">browse</span>
            </>
          )}
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">
          FIRST ROW IS COLUMN NAMES · ONE READING TIME PER ROW
        </span>
      </label>

      {error && (
        <p role="alert" className="flex items-center gap-2 text-xs text-red-600">
          <AlertCircle className="size-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
