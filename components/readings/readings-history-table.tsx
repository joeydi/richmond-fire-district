"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  deleteMeterReading,
  deleteChlorineReading,
  deleteReservoirReading,
  updateMeterReading,
  updateChlorineReading,
  updateReservoirReading,
} from "@/lib/actions/readings";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, StickyNote, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getLogDateParts } from "@/components/log/log-dates";
import {
  MeterReadingRow,
  ChlorineReadingRow,
  ReservoirReadingRow,
} from "@/lib/actions/readings";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useReadingSelection } from "./use-reading-selection";
import {
  Fact,
  formatDelta,
  formatElapsed,
  ReadingForm,
  ReadingHeader,
  ReadingSheetFrame,
  ReadOnlyNotes,
  readingKey,
  SectionLabel,
  type SheetNavProps,
} from "./reading-sheet";

// Thresholds match the dashboard and alerts
const CHLORINE_MIN = 0.2;
const CHLORINE_MAX = 4.0;

// Sticky header cells use an inset shadow because collapsed borders don't stick
const thClass =
  "sticky top-0 z-10 bg-zinc-50 px-2 py-1.5 text-left font-mono text-[10px] font-medium tracking-[0.06em] whitespace-nowrap text-muted-foreground uppercase shadow-[inset_0_-1px_0_var(--border)] first:pl-4 last:pr-4";
const tdClass = "px-2 py-[7px] first:pl-4 last:pr-4";

interface HistoryTableProps<T> {
  readings: T[];
  canEdit: boolean;
  /** From `?reading=`, so a link can open a reading's sheet */
  initialSelected: string | null;
}

/** Table on the left, docked sheet on the right from lg; the sheet overlays below lg */
function HistoryLayout({
  table,
  sheet,
  onCloseSheet,
}: {
  table: React.ReactNode;
  sheet: React.ReactNode;
  onCloseSheet: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1">
      {/* relative keeps sr-only header labels inside the scroll box */}
      <div className="relative min-w-0 flex-1 overflow-auto">
        <table className="w-full border-collapse text-xs">{table}</table>
      </div>
      {sheet && (
        <>
          <div aria-hidden="true" className="fixed inset-0 z-30 bg-zinc-950/20 lg:hidden" onClick={onCloseSheet} />
          <div
            className={cn(
              "fixed inset-y-0 right-0 z-40 w-full max-w-[420px] border-l shadow-lg",
              "lg:static lg:z-auto lg:w-[380px] lg:max-w-none lg:shrink-0 lg:shadow-[-8px_0_24px_-16px_rgb(24_24_27/0.18)]"
            )}
          >
            {sheet}
          </div>
        </>
      )}
    </div>
  );
}

function EmptyHistory({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-12 text-center text-xs text-muted-foreground">{children}</p>;
}

function DateCell({ iso, onSelect }: { iso: string; onSelect: () => void }) {
  const { date, time } = getLogDateParts(iso);
  return (
    <td className={cn(tdClass, "font-mono whitespace-nowrap text-zinc-700")}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        className="text-left outline-none focus-visible:underline"
      >
        {date} <span className="text-muted-foreground">{time}</span>
      </button>
    </td>
  );
}

function NotesCell({ notes }: { notes: string | null }) {
  return (
    <td className={cn(tdClass, "max-w-[280px] truncate text-zinc-700")} title={notes ?? undefined}>
      {notes ? (
        <span className="inline-flex max-w-full items-center gap-1.5">
          <StickyNote className="size-3 shrink-0 text-muted-foreground" />
          <span className="truncate">{notes}</span>
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      )}
    </td>
  );
}

function Flag({ children, title, tone = "muted" }: { children: React.ReactNode; title: string; tone?: "muted" | "brand" }) {
  return (
    <span
      title={title}
      className={cn(
        "rounded-sm px-1 font-mono text-[10px] whitespace-nowrap",
        tone === "brand" ? "bg-brand/10 text-cyan-900" : "bg-muted text-zinc-600"
      )}
    >
      {children}
    </span>
  );
}

function RowActions({ canEdit, onDelete }: { canEdit: boolean; onDelete: () => void }) {
  return (
    <td className={cn(tdClass, "w-10 py-0")}>
      {canEdit && (
        <div className="flex justify-end transition-opacity lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 text-muted-foreground"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="size-3.5" />
                <span className="sr-only">More actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="cursor-pointer text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 size-4" />
                Delete reading
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </td>
  );
}

function rowProps(id: string, selectedId: string | null, onSelect: () => void) {
  const isSelected = id === selectedId;
  return {
    "data-reading-id": id,
    "aria-selected": isSelected,
    onClick: onSelect,
    className: cn(
      "group cursor-pointer border-b border-zinc-100 transition-colors",
      isSelected ? "bg-brand/10" : "hover:bg-zinc-50/70"
    ),
  };
}

/** Confirms a delete, then runs it and closes the sheet if it showed that reading */
function useDeleteReading(
  kind: string,
  remove: (id: string) => Promise<{ success: boolean; error?: string }>,
  onDeleted: (id: string) => void
) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const confirm = () => {
    if (!pendingId) return;
    const id = pendingId;
    setPendingId(null);
    startTransition(async () => {
      const result = await remove(id);
      if (result.success) {
        toast.success(`${kind[0].toUpperCase()}${kind.slice(1)} reading deleted`);
        onDeleted(id);
      } else {
        toast.error(result.error || "Failed to delete reading");
      }
    });
  };

  const dialog = (
    <AlertDialog open={pendingId !== null} onOpenChange={(open) => !open && setPendingId(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {kind} reading</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this {kind} reading? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex justify-end gap-3">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={confirm} className="bg-red-600 hover:bg-red-700">
            Delete
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { requestDelete: setPendingId, dialog };
}

/** Readings are newest first, so a reading's predecessor is further down the list */
function findPrevious<T extends { id: string }>(readings: T[], reading: T, sameSeries: (r: T) => boolean) {
  const index = readings.indexOf(reading);
  return readings.slice(index + 1).find(sameSeries) ?? null;
}

function PreviousFacts({
  previous,
  current,
  delta,
  unit,
  fractionDigits,
}: {
  previous: { recorded_at: string } | null;
  current: { recorded_at: string };
  delta: number | null;
  unit: string;
  fractionDigits?: number;
}) {
  if (!previous || delta === null) {
    return <Fact label="Previous">Not on this page</Fact>;
  }
  const { date, time } = getLogDateParts(previous.recorded_at);
  const elapsed = new Date(current.recorded_at).getTime() - new Date(previous.recorded_at).getTime();
  return (
    <>
      <Fact label="Change">{formatDelta(delta, unit, fractionDigits)}</Fact>
      <Fact label="Since previous">
        {formatElapsed(elapsed)} <span className="text-muted-foreground">· {date} {time}</span>
      </Fact>
    </>
  );
}

// ---------------------------------------------------------------------------
// Meter

function meterValue(value: number) {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function MeterReadingSheet({
  reading,
  previous,
  canEdit,
  onDelete,
  nav,
}: {
  reading: MeterReadingRow;
  previous: MeterReadingRow | null;
  canEdit: boolean;
  onDelete: () => void;
  nav: SheetNavProps;
}) {
  const delta = previous ? reading.reading_value - previous.reading_value : null;
  const minutes = previous
    ? (new Date(reading.recorded_at).getTime() - new Date(previous.recorded_at).getTime()) / 60_000
    : 0;

  return (
    <ReadingSheetFrame label="Meter reading" canEdit={canEdit} onDelete={onDelete} {...nav}>
      <ReadingHeader
        kind={`Meter · ${reading.meter_name ?? "Unknown"}`}
        value={meterValue(reading.reading_value)}
        unit="gal"
        recordedAt={reading.recorded_at}
      />
      <section aria-label="Context" className="flex flex-col gap-1 border-t border-zinc-100 px-4 py-3">
        <SectionLabel>Context</SectionLabel>
        <dl className="flex flex-col">
          <PreviousFacts previous={previous} current={reading} delta={delta} unit="gal" />
          {previous && delta !== null && minutes > 0 && (
            <Fact label="Avg flow" tone={delta < 0 ? "warning" : undefined}>
              {(delta / minutes).toFixed(2)} gpm
            </Fact>
          )}
          {reading.production_rate != null && (
            <Fact label="Pump rate">
              {reading.production_rate.toFixed(2)} gpm
              <span className="text-muted-foreground"> · back-to-back</span>
            </Fact>
          )}
          {delta !== null && delta < 0 && (
            <Fact label="Check" tone="warning">
              Lower than the previous reading
            </Fact>
          )}
        </dl>
      </section>
      {canEdit ? (
        <ReadingForm
          key={readingKey(reading, reading.reading_value)}
          idPrefix="meter"
          value={reading.reading_value}
          recordedAt={reading.recorded_at}
          notes={reading.notes}
          valueLabel="Reading"
          unit="gal"
          step="0.01"
          hint={(value) =>
            value !== null && previous && value < previous.reading_value ? (
              <p className="text-xs text-amber-700">
                Below the previous reading of {meterValue(previous.reading_value)} gal
              </p>
            ) : null
          }
          onSave={({ value, recordedAt, notes }) =>
            updateMeterReading(reading.id, {
              meterId: reading.meter_id,
              readingValue: value,
              recordedAt,
              notes,
            })
          }
        />
      ) : (
        <ReadOnlyNotes notes={reading.notes} />
      )}
    </ReadingSheetFrame>
  );
}

export function MeterReadingsTable({ readings, canEdit, initialSelected }: HistoryTableProps<MeterReadingRow>) {
  const { selected, selectedId, select, sheetProps } = useReadingSelection(readings, initialSelected);
  const { requestDelete, dialog } = useDeleteReading("meter", deleteMeterReading, (id) => {
    if (id === selectedId) select(null);
  });
  const toggle = (id: string) => select(id === selectedId ? null : id);

  if (readings.length === 0) {
    return <EmptyHistory>No meter readings recorded yet</EmptyHistory>;
  }

  return (
    <>
      <HistoryLayout
        onCloseSheet={() => select(null)}
        sheet={
          selected && (
            <MeterReadingSheet
              reading={selected}
              previous={findPrevious(readings, selected, (r) => r.meter_id === selected.meter_id)}
              canEdit={canEdit}
              onDelete={() => requestDelete(selected.id)}
              nav={sheetProps}
            />
          )
        }
        table={
          <>
            <thead>
              <tr>
                <th className={thClass}>Date</th>
                <th className={thClass}>Meter</th>
                <th className={cn(thClass, "text-right")}>Reading · gal</th>
                <th className={cn(thClass, "text-right")} title="Gallons since this meter's previous reading">
                  Δ gal
                </th>
                <th className={cn(thClass, "text-right")} title="Pump flow from back-to-back readings">
                  Rate · gpm
                </th>
                <th className={thClass}>Notes</th>
                <th className={thClass}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {readings.map((reading, i) => {
                const previous = readings.slice(i + 1).find((r) => r.meter_id === reading.meter_id);
                const delta = previous ? reading.reading_value - previous.reading_value : null;
                return (
                  <tr key={reading.id} {...rowProps(reading.id, selectedId, () => toggle(reading.id))}>
                    <DateCell iso={reading.recorded_at} onSelect={() => toggle(reading.id)} />
                    <td className={cn(tdClass, "whitespace-nowrap")}>{reading.meter_name ?? "—"}</td>
                    <td className={cn(tdClass, "text-right font-mono whitespace-nowrap")}>
                      {meterValue(reading.reading_value)}
                    </td>
                    <td
                      className={cn(
                        tdClass,
                        "text-right font-mono whitespace-nowrap text-zinc-600",
                        delta !== null && delta < 0 && "text-amber-700"
                      )}
                    >
                      {delta === null
                        ? "—"
                        : `${delta >= 0 ? "+" : "−"}${Math.abs(delta).toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                    </td>
                    <td className={cn(tdClass, "text-right")}>
                      {reading.production_rate != null ? (
                        <Flag tone="brand" title="Pump flow from back-to-back readings">
                          {reading.production_rate.toFixed(2)}
                        </Flag>
                      ) : (
                        <span className="font-mono text-muted-foreground">—</span>
                      )}
                    </td>
                    <NotesCell notes={reading.notes} />
                    <RowActions canEdit={canEdit} onDelete={() => requestDelete(reading.id)} />
                  </tr>
                );
              })}
            </tbody>
          </>
        }
      />
      {dialog}
    </>
  );
}

// ---------------------------------------------------------------------------
// Chlorine

function chlorineStatus(level: number) {
  return level < CHLORINE_MIN ? "low" : level > CHLORINE_MAX ? "high" : "ok";
}

function ChlorineStatus({ level }: { level: number }) {
  const status = chlorineStatus(level);
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-zinc-700 uppercase">
      <span
        className={cn(
          "size-1.5 rounded-full",
          status === "ok" && "bg-green-600",
          status === "low" && "bg-red-600",
          status === "high" && "bg-amber-500"
        )}
      />
      {status === "ok" ? "In range" : status}
    </span>
  );
}

function ChlorineReadingSheet({
  reading,
  previous,
  canEdit,
  onDelete,
  nav,
}: {
  reading: ChlorineReadingRow;
  previous: ChlorineReadingRow | null;
  canEdit: boolean;
  onDelete: () => void;
  nav: SheetNavProps;
}) {
  const delta = previous ? reading.residual_level - previous.residual_level : null;

  return (
    <ReadingSheetFrame label="Chlorine reading" canEdit={canEdit} onDelete={onDelete} {...nav}>
      <ReadingHeader
        kind={`Chlorine${reading.location_name ? ` · ${reading.location_name}` : ""}`}
        value={reading.residual_level.toFixed(2)}
        unit="mg/L"
        recordedAt={reading.recorded_at}
      >
        <ChlorineStatus level={reading.residual_level} />
      </ReadingHeader>
      <section aria-label="Context" className="flex flex-col gap-1 border-t border-zinc-100 px-4 py-3">
        <SectionLabel>Context</SectionLabel>
        <dl className="flex flex-col">
          <Fact label="Safe range">
            {CHLORINE_MIN.toFixed(2)}–{CHLORINE_MAX.toFixed(2)} mg/L
          </Fact>
          <PreviousFacts previous={previous} current={reading} delta={delta} unit="mg/L" />
        </dl>
      </section>
      {canEdit ? (
        <ReadingForm
          key={readingKey(reading, reading.residual_level)}
          idPrefix="chlorine"
          value={reading.residual_level}
          recordedAt={reading.recorded_at}
          notes={reading.notes}
          valueLabel="Residual"
          unit="mg/L"
          step="0.01"
          max={10}
          hint={(value) =>
            value !== null && chlorineStatus(value) !== "ok" ? (
              <p className="text-xs text-amber-700">
                Outside the safe range of {CHLORINE_MIN.toFixed(2)}–{CHLORINE_MAX.toFixed(2)} mg/L
              </p>
            ) : null
          }
          onSave={({ value, recordedAt, notes }) =>
            updateChlorineReading(reading.id, {
              locationId: reading.location_id ?? undefined,
              residualLevel: value,
              recordedAt,
              notes,
            })
          }
        />
      ) : (
        <ReadOnlyNotes notes={reading.notes} />
      )}
    </ReadingSheetFrame>
  );
}

export function ChlorineReadingsTable({ readings, canEdit, initialSelected }: HistoryTableProps<ChlorineReadingRow>) {
  const { selected, selectedId, select, sheetProps } = useReadingSelection(readings, initialSelected);
  const { requestDelete, dialog } = useDeleteReading("chlorine", deleteChlorineReading, (id) => {
    if (id === selectedId) select(null);
  });
  const toggle = (id: string) => select(id === selectedId ? null : id);

  if (readings.length === 0) {
    return <EmptyHistory>No chlorine readings recorded yet</EmptyHistory>;
  }

  // Most chlorine readings have no sampling location; only show the column when used
  const showLocation = readings.some((r) => r.location_name);

  return (
    <>
      <HistoryLayout
        onCloseSheet={() => select(null)}
        sheet={
          selected && (
            <ChlorineReadingSheet
              reading={selected}
              previous={findPrevious(readings, selected, (r) => r.location_id === selected.location_id)}
              canEdit={canEdit}
              onDelete={() => requestDelete(selected.id)}
              nav={sheetProps}
            />
          )
        }
        table={
          <>
            <thead>
              <tr>
                <th className={thClass}>Date</th>
                {showLocation && <th className={thClass}>Location</th>}
                <th className={cn(thClass, "text-right")}>Residual · mg/L</th>
                <th className={thClass}>Range</th>
                <th className={thClass}>Notes</th>
                <th className={thClass}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {readings.map((reading) => (
                <tr key={reading.id} {...rowProps(reading.id, selectedId, () => toggle(reading.id))}>
                  <DateCell iso={reading.recorded_at} onSelect={() => toggle(reading.id)} />
                  {showLocation && (
                    <td className={cn(tdClass, "whitespace-nowrap")}>
                      {reading.location_name ?? <span className="text-muted-foreground">—</span>}
                    </td>
                  )}
                  <td className={cn(tdClass, "text-right font-mono")}>{reading.residual_level.toFixed(2)}</td>
                  <td className={cn(tdClass, "whitespace-nowrap")}>
                    <ChlorineStatus level={reading.residual_level} />
                  </td>
                  <NotesCell notes={reading.notes} />
                  <RowActions canEdit={canEdit} onDelete={() => requestDelete(reading.id)} />
                </tr>
              ))}
            </tbody>
          </>
        }
      />
      {dialog}
    </>
  );
}

// ---------------------------------------------------------------------------
// Reservoir

function CapacityBar({ percent, className }: { percent: number; className?: string }) {
  return (
    <div className={cn("h-1.5 overflow-hidden bg-zinc-200", className)} aria-hidden="true">
      <div className="h-full bg-brand" style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
    </div>
  );
}

function ReservoirReadingSheet({
  reading,
  previous,
  canEdit,
  onDelete,
  nav,
}: {
  reading: ReservoirReadingRow;
  previous: ReservoirReadingRow | null;
  canEdit: boolean;
  onDelete: () => void;
  nav: SheetNavProps;
}) {
  const delta = previous ? reading.level_inches - previous.level_inches : null;
  const max = reading.reservoir_max_inches;

  return (
    <ReadingSheetFrame label="Reservoir reading" canEdit={canEdit} onDelete={onDelete} {...nav}>
      <ReadingHeader
        kind={`Reservoir · ${reading.reservoir_name ?? "Unknown"}`}
        value={reading.level_inches.toLocaleString(undefined, { maximumFractionDigits: 1 })}
        unit="in"
        recordedAt={reading.recorded_at}
      >
        {reading.level_percent != null && (
          <div className="flex items-center gap-2">
            <CapacityBar percent={reading.level_percent} className="flex-1" />
            <span className="font-mono text-[11px] text-zinc-700">{reading.level_percent.toFixed(1)}%</span>
          </div>
        )}
      </ReadingHeader>
      <section aria-label="Context" className="flex flex-col gap-1 border-t border-zinc-100 px-4 py-3">
        <SectionLabel>Context</SectionLabel>
        <dl className="flex flex-col">
          {max != null && <Fact label="Max level">{max} in</Fact>}
          <PreviousFacts previous={previous} current={reading} delta={delta} unit="in" fractionDigits={1} />
        </dl>
      </section>
      {canEdit ? (
        <ReadingForm
          key={readingKey(reading, reading.level_inches)}
          idPrefix="reservoir"
          value={reading.level_inches}
          recordedAt={reading.recorded_at}
          notes={reading.notes}
          valueLabel="Level"
          unit="in"
          step="0.1"
          hint={(value) =>
            value !== null && max ? (
              <p className={cn("font-mono text-[11px]", value > max ? "text-amber-700" : "text-muted-foreground")}>
                {value > max
                  ? `Above the max level of ${max} in`
                  : `${((value / max) * 100).toFixed(1)}% of ${max} in`}
              </p>
            ) : null
          }
          onSave={({ value, recordedAt, notes }) =>
            updateReservoirReading(reading.id, {
              reservoirId: reading.reservoir_id,
              levelInches: value,
              // Derived from the max level, as when the reading was entered
              levelPercent: max ? Math.min(100, (value / max) * 100) : (reading.level_percent ?? undefined),
              recordedAt,
              notes,
            })
          }
        />
      ) : (
        <ReadOnlyNotes notes={reading.notes} />
      )}
    </ReadingSheetFrame>
  );
}

export function ReservoirReadingsTable({ readings, canEdit, initialSelected }: HistoryTableProps<ReservoirReadingRow>) {
  const { selected, selectedId, select, sheetProps } = useReadingSelection(readings, initialSelected);
  const { requestDelete, dialog } = useDeleteReading("reservoir", deleteReservoirReading, (id) => {
    if (id === selectedId) select(null);
  });
  const toggle = (id: string) => select(id === selectedId ? null : id);

  if (readings.length === 0) {
    return <EmptyHistory>No reservoir readings recorded yet</EmptyHistory>;
  }

  return (
    <>
      <HistoryLayout
        onCloseSheet={() => select(null)}
        sheet={
          selected && (
            <ReservoirReadingSheet
              reading={selected}
              previous={findPrevious(readings, selected, (r) => r.reservoir_id === selected.reservoir_id)}
              canEdit={canEdit}
              onDelete={() => requestDelete(selected.id)}
              nav={sheetProps}
            />
          )
        }
        table={
          <>
            <thead>
              <tr>
                <th className={thClass}>Date</th>
                <th className={thClass}>Reservoir</th>
                <th className={cn(thClass, "text-right")}>Level · in</th>
                <th className={thClass}>Capacity</th>
                <th className={thClass}>Notes</th>
                <th className={thClass}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {readings.map((reading) => (
                <tr key={reading.id} {...rowProps(reading.id, selectedId, () => toggle(reading.id))}>
                  <DateCell iso={reading.recorded_at} onSelect={() => toggle(reading.id)} />
                  <td className={cn(tdClass, "font-mono whitespace-nowrap")}>{reading.reservoir_name ?? "—"}</td>
                  <td className={cn(tdClass, "text-right font-mono")}>
                    {reading.level_inches.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                  </td>
                  <td className={cn(tdClass, "whitespace-nowrap")}>
                    {reading.level_percent != null ? (
                      <div className="flex items-center gap-2">
                        <CapacityBar percent={reading.level_percent} className="w-16" />
                        <span className="font-mono text-zinc-700">{reading.level_percent.toFixed(1)}%</span>
                      </div>
                    ) : (
                      <span className="font-mono text-muted-foreground">—</span>
                    )}
                  </td>
                  <NotesCell notes={reading.notes} />
                  <RowActions canEdit={canEdit} onDelete={() => requestDelete(reading.id)} />
                </tr>
              ))}
            </tbody>
          </>
        }
      />
      {dialog}
    </>
  );
}
