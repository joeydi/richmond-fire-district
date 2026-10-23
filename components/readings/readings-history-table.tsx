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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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

// Helper to convert ISO datetime to local datetime-local input format
function toLocalDateTimeString(isoString: string): string {
  const date = new Date(isoString);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

// Thresholds match the dashboard and alerts
const CHLORINE_MIN = 0.2;
const CHLORINE_MAX = 4.0;

const thClass =
  "border-b bg-zinc-50 px-2 py-1.5 text-left font-mono text-[10px] font-medium tracking-[0.06em] whitespace-nowrap text-muted-foreground uppercase first:pl-4 last:pr-4";
const tdClass = "px-2 py-[7px] first:pl-4 last:pr-4";

function HistoryTable({ children }: { children: React.ReactNode }) {
  // relative keeps sr-only header labels inside the scroll box
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  );
}

function EmptyHistory({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-12 text-center text-xs text-muted-foreground">{children}</p>;
}

function DateCell({ iso }: { iso: string }) {
  const { date, time } = getLogDateParts(iso);
  return (
    <td className={cn(tdClass, "font-mono whitespace-nowrap text-zinc-700")}>
      {date} <span className="text-muted-foreground">{time}</span>
    </td>
  );
}

function NotesCell({ notes }: { notes: string | null }) {
  return (
    <td className={cn(tdClass, "max-w-[280px] truncate text-zinc-700")} title={notes ?? undefined}>
      {notes ?? <span className="text-muted-foreground">—</span>}
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

function RowActions({
  label,
  disabled,
  onEdit,
  onDelete,
}: {
  label: string;
  disabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <td className={cn(tdClass, "w-16 py-0")}>
      <div className="flex justify-end gap-0.5 transition-opacity lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100">
        <Button
          variant="ghost"
          size="icon"
          className="size-6 text-muted-foreground"
          onClick={onEdit}
          disabled={disabled}
          title={`Edit ${label}`}
        >
          <Pencil className="size-3" />
          <span className="sr-only">Edit {label}</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-6 text-muted-foreground" disabled={disabled}>
              <MoreHorizontal className="size-3.5" />
              <span className="sr-only">More actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={onDelete} className="cursor-pointer text-red-600 focus:text-red-600">
              <Trash2 className="mr-2 size-4" />
              Delete reading
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </td>
  );
}

const rowClass = "group border-b border-zinc-100 transition-colors hover:bg-zinc-50/70";

export function MeterReadingsTable({ readings }: { readings: MeterReadingRow[] }) {
  const [isPending, startTransition] = useTransition();
  const [readingToDelete, setReadingToDelete] = useState<string | null>(null);
  const [readingToEdit, setReadingToEdit] = useState<MeterReadingRow | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editDateTime, setEditDateTime] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const handleDelete = async () => {
    if (!readingToDelete) return;

    startTransition(async () => {
      const result = await deleteMeterReading(readingToDelete);
      if (result.success) {
        toast.success("Meter reading deleted");
      } else {
        toast.error(result.error || "Failed to delete reading");
      }
    });

    setReadingToDelete(null);
  };

  const openEditDialog = (reading: MeterReadingRow) => {
    setReadingToEdit(reading);
    setEditValue(reading.reading_value.toString());
    setEditDateTime(toLocalDateTimeString(reading.recorded_at));
    setEditNotes(reading.notes ?? "");
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!readingToEdit) return;

    startTransition(async () => {
      const result = await updateMeterReading(readingToEdit.id, {
        meterId: readingToEdit.meter_id,
        readingValue: parseFloat(editValue),
        recordedAt: new Date(editDateTime).toISOString(),
        notes: editNotes || undefined,
      });
      if (result.success) {
        toast.success("Meter reading updated");
        setReadingToEdit(null);
      } else {
        toast.error(result.error || "Failed to update reading");
      }
    });
  };

  if (readings.length === 0) {
    return <EmptyHistory>No meter readings recorded yet</EmptyHistory>;
  }

  return (
    <>
      <HistoryTable>
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
            // Readings are newest first; the previous one for this meter is further down
            const previous = readings.slice(i + 1).find((r) => r.meter_id === reading.meter_id);
            const delta = previous ? reading.reading_value - previous.reading_value : null;
            return (
              <tr key={reading.id} className={rowClass}>
                <DateCell iso={reading.recorded_at} />
                <td className={cn(tdClass, "whitespace-nowrap")}>{reading.meter_name ?? "—"}</td>
                <td className={cn(tdClass, "text-right")}>
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="font-mono whitespace-nowrap">
                      {reading.reading_value.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
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
                <RowActions
                  label="meter reading"
                  disabled={isPending}
                  onEdit={() => openEditDialog(reading)}
                  onDelete={() => setReadingToDelete(reading.id)}
                />
              </tr>
            );
          })}
        </tbody>
      </HistoryTable>

      {/* Edit Dialog */}
      <Dialog open={readingToEdit !== null} onOpenChange={(open) => !open && setReadingToEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Meter Reading</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-meter-datetime">Date & Time</Label>
              <Input
                id="edit-meter-datetime"
                type="datetime-local"
                value={editDateTime}
                onChange={(e) => setEditDateTime(e.target.value)}
                required
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-meter-value">Reading Value (gallons)</Label>
              <Input
                id="edit-meter-value"
                type="number"
                step="0.01"
                min="0"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                required
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-meter-notes">Notes (optional)</Label>
              <Textarea
                id="edit-meter-notes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setReadingToEdit(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !editValue || !editDateTime}>
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={readingToDelete !== null} onOpenChange={(open) => !open && setReadingToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete meter reading</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this meter reading? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function ChlorineReadingsTable({
  readings,
}: {
  readings: ChlorineReadingRow[];
}) {
  const [isPending, startTransition] = useTransition();
  const [readingToDelete, setReadingToDelete] = useState<string | null>(null);
  const [readingToEdit, setReadingToEdit] = useState<ChlorineReadingRow | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editDateTime, setEditDateTime] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const handleDelete = async () => {
    if (!readingToDelete) return;

    startTransition(async () => {
      const result = await deleteChlorineReading(readingToDelete);
      if (result.success) {
        toast.success("Chlorine reading deleted");
      } else {
        toast.error(result.error || "Failed to delete reading");
      }
    });

    setReadingToDelete(null);
  };

  const openEditDialog = (reading: ChlorineReadingRow) => {
    setReadingToEdit(reading);
    setEditValue(reading.residual_level.toString());
    setEditDateTime(toLocalDateTimeString(reading.recorded_at));
    setEditNotes(reading.notes ?? "");
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!readingToEdit) return;

    startTransition(async () => {
      const result = await updateChlorineReading(readingToEdit.id, {
        locationId: readingToEdit.location_id ?? undefined,
        residualLevel: parseFloat(editValue),
        recordedAt: new Date(editDateTime).toISOString(),
        notes: editNotes || undefined,
      });
      if (result.success) {
        toast.success("Chlorine reading updated");
        setReadingToEdit(null);
      } else {
        toast.error(result.error || "Failed to update reading");
      }
    });
  };

  if (readings.length === 0) {
    return <EmptyHistory>No chlorine readings recorded yet</EmptyHistory>;
  }

  // Most chlorine readings have no sampling location; only show the column when used
  const showLocation = readings.some((r) => r.location_name);

  return (
    <>
      <HistoryTable>
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
          {readings.map((reading) => {
            const level = reading.residual_level;
            const status =
              level < CHLORINE_MIN ? "low" : level > CHLORINE_MAX ? "high" : "ok";
            return (
              <tr key={reading.id} className={rowClass}>
                <DateCell iso={reading.recorded_at} />
                {showLocation && (
                  <td className={cn(tdClass, "whitespace-nowrap")}>
                    {reading.location_name ?? <span className="text-muted-foreground">—</span>}
                  </td>
                )}
                <td className={cn(tdClass, "text-right")}>
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="font-mono">{level.toFixed(2)}</span>
                  </div>
                </td>
                <td className={cn(tdClass, "whitespace-nowrap")}>
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
                </td>
                <NotesCell notes={reading.notes} />
                <RowActions
                  label="chlorine reading"
                  disabled={isPending}
                  onEdit={() => openEditDialog(reading)}
                  onDelete={() => setReadingToDelete(reading.id)}
                />
              </tr>
            );
          })}
        </tbody>
      </HistoryTable>

      {/* Edit Dialog */}
      <Dialog open={readingToEdit !== null} onOpenChange={(open) => !open && setReadingToEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Chlorine Reading</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-chlorine-datetime">Date & Time</Label>
              <Input
                id="edit-chlorine-datetime"
                type="datetime-local"
                value={editDateTime}
                onChange={(e) => setEditDateTime(e.target.value)}
                required
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-chlorine-value">Residual Level (mg/L)</Label>
              <Input
                id="edit-chlorine-value"
                type="number"
                step="0.01"
                min="0"
                max="10"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                required
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-chlorine-notes">Notes (optional)</Label>
              <Textarea
                id="edit-chlorine-notes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setReadingToEdit(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !editValue || !editDateTime}>
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={readingToDelete !== null} onOpenChange={(open) => !open && setReadingToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete chlorine reading</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this chlorine reading? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function ReservoirReadingsTable({
  readings,
}: {
  readings: ReservoirReadingRow[];
}) {
  const [isPending, startTransition] = useTransition();
  const [readingToDelete, setReadingToDelete] = useState<string | null>(null);
  const [readingToEdit, setReadingToEdit] = useState<ReservoirReadingRow | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editPercent, setEditPercent] = useState("");
  const [editDateTime, setEditDateTime] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const handleDelete = async () => {
    if (!readingToDelete) return;

    startTransition(async () => {
      const result = await deleteReservoirReading(readingToDelete);
      if (result.success) {
        toast.success("Reservoir reading deleted");
      } else {
        toast.error(result.error || "Failed to delete reading");
      }
    });

    setReadingToDelete(null);
  };

  const openEditDialog = (reading: ReservoirReadingRow) => {
    setReadingToEdit(reading);
    setEditValue(reading.level_inches.toString());
    setEditPercent(reading.level_percent?.toString() ?? "");
    setEditDateTime(toLocalDateTimeString(reading.recorded_at));
    setEditNotes(reading.notes ?? "");
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!readingToEdit) return;

    startTransition(async () => {
      const result = await updateReservoirReading(readingToEdit.id, {
        reservoirId: readingToEdit.reservoir_id,
        levelInches: parseFloat(editValue),
        levelPercent: editPercent ? parseFloat(editPercent) : undefined,
        recordedAt: new Date(editDateTime).toISOString(),
        notes: editNotes || undefined,
      });
      if (result.success) {
        toast.success("Reservoir reading updated");
        setReadingToEdit(null);
      } else {
        toast.error(result.error || "Failed to update reading");
      }
    });
  };

  if (readings.length === 0) {
    return <EmptyHistory>No reservoir readings recorded yet</EmptyHistory>;
  }

  return (
    <>
      <HistoryTable>
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
            <tr key={reading.id} className={rowClass}>
              <DateCell iso={reading.recorded_at} />
              <td className={cn(tdClass, "font-mono whitespace-nowrap")}>
                {reading.reservoir_name ?? "—"}
              </td>
              <td className={cn(tdClass, "text-right font-mono")}>
                {reading.level_inches.toLocaleString(undefined, { maximumFractionDigits: 1 })}
              </td>
              <td className={cn(tdClass, "whitespace-nowrap")}>
                {reading.level_percent != null ? (
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden bg-zinc-200" aria-hidden="true">
                      <div
                        className="h-full bg-brand"
                        style={{ width: `${Math.min(100, Math.max(0, reading.level_percent))}%` }}
                      />
                    </div>
                    <span className="font-mono text-zinc-700">{reading.level_percent.toFixed(1)}%</span>
                  </div>
                ) : (
                  <span className="font-mono text-muted-foreground">—</span>
                )}
              </td>
              <NotesCell notes={reading.notes} />
              <RowActions
                label="reservoir reading"
                disabled={isPending}
                onEdit={() => openEditDialog(reading)}
                onDelete={() => setReadingToDelete(reading.id)}
              />
            </tr>
          ))}
        </tbody>
      </HistoryTable>

      {/* Edit Dialog */}
      <Dialog open={readingToEdit !== null} onOpenChange={(open) => !open && setReadingToEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Reservoir Reading</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-reservoir-datetime">Date & Time</Label>
              <Input
                id="edit-reservoir-datetime"
                type="datetime-local"
                value={editDateTime}
                onChange={(e) => setEditDateTime(e.target.value)}
                required
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-reservoir-value">Level (inches)</Label>
              <Input
                id="edit-reservoir-value"
                type="number"
                step="0.1"
                min="0"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                required
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-reservoir-percent">Percent (optional)</Label>
              <Input
                id="edit-reservoir-percent"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={editPercent}
                onChange={(e) => setEditPercent(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-reservoir-notes">Notes (optional)</Label>
              <Textarea
                id="edit-reservoir-notes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setReadingToEdit(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !editValue || !editDateTime}>
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={readingToDelete !== null} onOpenChange={(open) => !open && setReadingToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete reservoir reading</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this reservoir reading? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
