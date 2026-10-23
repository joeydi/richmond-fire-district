"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, MoreHorizontal, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { fromDistrictInputValue, getLogDateParts, toDistrictInputValue } from "@/components/log/log-dates";

export interface SheetNavProps {
  /** "12 / 100" */
  positionLabel: string | null;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}

const labelClass = "font-mono text-[10px] font-normal tracking-[0.08em] text-muted-foreground uppercase";

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">{children}</div>;
}

export function Fact({
  label,
  children,
  tone,
}: {
  label: string;
  children: React.ReactNode;
  tone?: "warning";
}) {
  return (
    <div className="flex min-h-7 items-center gap-2">
      <dt className="w-28 shrink-0 font-mono text-[10px] tracking-[0.06em] text-muted-foreground uppercase">{label}</dt>
      <dd className={cn("min-w-0 flex-1 truncate font-mono text-xs", tone === "warning" && "text-amber-700")}>
        {children}
      </dd>
    </div>
  );
}

/** Toolbar, scroll body and shortcut hints shared by the meter, chlorine and reservoir sheets */
export function ReadingSheetFrame({
  label,
  canEdit,
  onDelete,
  positionLabel,
  onClose,
  onPrev,
  onNext,
  children,
}: SheetNavProps & {
  label: string;
  canEdit: boolean;
  onDelete: () => void;
  children: React.ReactNode;
}) {
  return (
    <aside aria-label={`${label} details`} className="flex h-full w-full flex-col bg-background">
      <div className="flex h-11 shrink-0 items-center gap-1 border-b px-2 pl-3">
        <Button variant="outline" size="icon" className="size-7" onClick={onPrev} disabled={!onPrev} title="Newer reading (↑)">
          <ArrowUp className="size-3.5" />
          <span className="sr-only">Newer reading</span>
        </Button>
        <Button variant="outline" size="icon" className="size-7" onClick={onNext} disabled={!onNext} title="Older reading (↓)">
          <ArrowDown className="size-3.5" />
          <span className="sr-only">Older reading</span>
        </Button>
        <span className="ml-1.5 flex-1 font-mono text-[11px] text-muted-foreground">{positionLabel}</span>
        {canEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-7 text-muted-foreground">
                <MoreHorizontal className="size-4" />
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
        )}
        <Button variant="ghost" size="icon" className="size-7 text-muted-foreground" onClick={onClose} title="Close (Esc)">
          <X className="size-4" />
          <span className="sr-only">Close details</span>
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">{children}</div>

      <div className="hidden h-9 shrink-0 items-center border-t px-4 font-mono text-[10px] text-muted-foreground lg:flex">
        ESC CLOSE · ↑↓ NAVIGATE
      </div>
    </aside>
  );
}

/** Kind, headline value and timestamp at the top of a reading sheet */
export function ReadingHeader({
  kind,
  value,
  unit,
  recordedAt,
  children,
}: {
  kind: string;
  value: string;
  unit: string;
  recordedAt: string;
  children?: React.ReactNode;
}) {
  const { date, time } = getLogDateParts(recordedAt);
  return (
    <div className="flex flex-col gap-1.5 px-4 pt-3.5 pb-3">
      <span className="font-mono text-[10px] tracking-[0.06em] text-zinc-700 uppercase">{kind}</span>
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-2xl leading-none font-medium tracking-tight">{value}</span>
        <span className="font-mono text-xs text-muted-foreground">{unit}</span>
      </div>
      {children}
      <span className="font-mono text-[11px] text-muted-foreground">
        {date} {time}
      </span>
    </div>
  );
}

export interface ReadingFormValues {
  value: number;
  recordedAt: string;
  notes: string | undefined;
}

interface ReadingFormProps {
  /** Prefix for input ids */
  idPrefix: string;
  value: number;
  recordedAt: string;
  notes: string | null;
  valueLabel: string;
  unit: string;
  step: string;
  min?: number;
  max?: number;
  /** Live feedback under the value, e.g. a range warning */
  hint?: (value: number | null) => React.ReactNode;
  onSave: (values: ReadingFormValues) => Promise<{ success: boolean; error?: string }>;
}

/**
 * Date, value and notes for one reading. Remount it (via key) when the reading's
 * saved data changes so the fields reset to the new values.
 */
export function ReadingForm({
  idPrefix,
  value: savedValue,
  recordedAt,
  notes: savedNotes,
  valueLabel,
  unit,
  step,
  min = 0,
  max,
  hint,
  onSave,
}: ReadingFormProps) {
  const initialDateTime = toDistrictInputValue(recordedAt);
  const [value, setValue] = useState(String(savedValue));
  const [dateTime, setDateTime] = useState(initialDateTime);
  const [notes, setNotes] = useState(savedNotes ?? "");
  const [isSaving, startSaving] = useTransition();

  const parsed = value.trim() === "" ? null : Number(value);
  const valid = parsed !== null && Number.isFinite(parsed) && parsed >= min && (max === undefined || parsed <= max);
  const hasChanges = parsed !== savedValue || dateTime !== initialDateTime || notes.trim() !== (savedNotes ?? "");

  const reset = () => {
    setValue(String(savedValue));
    setDateTime(initialDateTime);
    setNotes(savedNotes ?? "");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || !dateTime) return;
    startSaving(async () => {
      const result = await onSave({
        value: parsed!,
        // Untouched dates keep their original seconds and avoid re-deriving an
        // ambiguous wall-clock time around DST changes
        recordedAt: dateTime === initialDateTime ? recordedAt : fromDistrictInputValue(dateTime),
        notes: notes.trim() || undefined,
      });
      if (result.success) {
        toast.success("Reading updated");
      } else {
        toast.error(result.error || "Failed to update reading");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 border-t border-zinc-100 px-4 py-3.5">
      <SectionLabel>Edit</SectionLabel>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-value`} className={labelClass}>
          {valueLabel} · {unit}
        </Label>
        <Input
          id={`${idPrefix}-value`}
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          max={max}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={isSaving}
          required
          aria-invalid={value !== "" && !valid}
          className="h-8 font-mono text-[13px]"
        />
        {hint?.(valid ? parsed : null)}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-datetime`} className={labelClass}>
          Recorded
        </Label>
        <Input
          id={`${idPrefix}-datetime`}
          type="datetime-local"
          value={dateTime}
          onChange={(e) => setDateTime(e.target.value)}
          disabled={isSaving}
          required
          className="h-8 font-mono text-[13px]"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-notes`} className={labelClass}>
          Notes
        </Label>
        <Textarea
          id={`${idPrefix}-notes`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={isSaving}
          rows={3}
          className="min-h-0 text-[13px]"
        />
      </div>
      <div className="flex gap-2">
        <Button
          type="submit"
          size="sm"
          className="h-7 px-2.5 text-xs"
          disabled={isSaving || !hasChanges || !valid || !dateTime}
        >
          {isSaving ? "Saving…" : "Save changes"}
        </Button>
        {hasChanges && !isSaving && (
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2.5 text-xs" onClick={reset}>
            Discard
          </Button>
        )}
      </div>
    </form>
  );
}

/** Notes for people who can't edit */
export function ReadOnlyNotes({ notes }: { notes: string | null }) {
  return (
    <section aria-label="Notes" className="flex flex-col gap-1.5 border-t border-zinc-100 px-4 py-3">
      <SectionLabel>Notes</SectionLabel>
      {notes ? (
        <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{notes}</p>
      ) : (
        <p className="text-xs text-muted-foreground">No notes</p>
      )}
    </section>
  );
}

/** Form remount key: changes whenever the reading's saved data does */
export function readingKey(reading: { id: string; recorded_at: string; notes: string | null }, value: number) {
  return `${reading.id}:${reading.recorded_at}:${value}:${reading.notes ?? ""}`;
}

/** Signed change with a unit, "+1,204 gal" */
export function formatDelta(delta: number, unit: string, fractionDigits = 2) {
  const sign = delta > 0 ? "+" : delta < 0 ? "−" : "±";
  return `${sign}${Math.abs(delta).toLocaleString(undefined, { maximumFractionDigits: fractionDigits })} ${unit}`;
}

/** "3d 4h", "2h 15m", "45m" */
export function formatElapsed(ms: number) {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}
