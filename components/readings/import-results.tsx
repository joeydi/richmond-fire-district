"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ImportResult } from "@/lib/actions/readings-import";
import type { ColumnMapping } from "./import-wizard";
import { RowErrors, StatStrip, StepFooter } from "./import-ui";

interface ImportResultsProps {
  result: ImportResult;
  mapping: ColumnMapping;
  onImportAnother: () => void;
}

/** The history tab for the imported readings, or the entry page when several types were imported */
function readingsHref(mapping: ColumnMapping): string {
  const types = (["meter", "chlorine", "reservoir"] as const).filter((t) => mapping[t]);
  return types.length === 1 ? `/dashboard/readings/${types[0]}` : "/dashboard/readings";
}

export function ImportResults({ result, mapping, onImportAnother }: ImportResultsProps) {
  const saved = result.inserted + result.updated;
  const isSuccess = result.success && saved > 0;

  return (
    <>
      <div className="flex flex-col gap-5 p-4">
        <div className="flex items-start gap-2.5">
          {isSuccess ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
          ) : (
            <XCircle className="mt-0.5 size-4 shrink-0 text-red-600" />
          )}
          <div>
            <h3 className="text-[13px] font-semibold">
              {isSuccess
                ? `Saved ${saved.toLocaleString()} ${saved === 1 ? "reading" : "readings"}`
                : saved === 0 && result.errors.length === 0
                  ? "Nothing was imported"
                  : "Import failed"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {isSuccess
                ? result.errors.length > 0
                  ? "Some rows failed. They're listed below; fix them in the file and import it again."
                  : "The readings are in the history and on the dashboard."
                : saved === 0 && result.errors.length === 0
                  ? "Every reading in the file was already recorded."
                  : "No readings were saved. Check the problems below and try again."}
            </p>
          </div>
        </div>

        <StatStrip
          stats={[
            { label: "Inserted", value: result.inserted, tone: "good" },
            { label: "Updated", value: result.updated },
            { label: "Skipped", value: result.skipped },
          ]}
        />

        <RowErrors title="Failed" errors={result.errors} />
      </div>

      <StepFooter>
        <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs" onClick={onImportAnother}>
          <RefreshCw className="size-3.5" />
          Import another file
        </Button>
        <Button asChild size="sm" className="h-7 px-2.5 text-xs">
          <Link href={readingsHref(mapping)}>
            View readings
            <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </StepFooter>
    </>
  );
}
