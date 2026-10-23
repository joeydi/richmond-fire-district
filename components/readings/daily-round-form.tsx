"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, Minus, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { CameraCapture } from "./camera-capture";
import { getLogDateParts } from "@/components/log/log-dates";
import {
  insertChlorineReading,
  insertMeterReading,
  insertReservoirReading,
  type DailyRoundContext,
  type LastReading,
} from "@/lib/actions/readings";

// Thresholds match the dashboard and alerts
const CHLORINE_MIN = 0.2;
const CHLORINE_MAX = 4.0;
const CHLORINE_SCALE_MAX = 4.0;
const CHLORINE_LIMIT = 10; // server-side validation maximum
const TANK_SEGMENTS = 20;
const RESERVOIR_STEP_IN = 1;

type Kind = "meter" | "chlorine" | "reservoir";

interface DailyRoundFormProps {
  context: DailyRoundContext;
  /** "FRI · OCT 23", in the district's time zone */
  todayLabel: string;
  /** Request time in ms, for "3d ago" */
  now: number;
}

function parseEntry(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatAgo(iso: string, now: number): string {
  const minutes = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function PreviousLine({ last, digits, now }: { last: LastReading | null; digits: number; now: number }) {
  if (!last) return <span>NO PREVIOUS READING</span>;
  const { date, time } = getLogDateParts(last.recordedAt);
  return (
    <span>
      PREV{" "}
      {last.value.toLocaleString(undefined, {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })}{" "}
      · {date.slice(5)} {time} · {formatAgo(last.recordedAt, now).toUpperCase()}
    </span>
  );
}

function SectionHeader({
  index,
  title,
  done,
  children,
}: {
  index: number;
  title: string;
  done: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-7 items-center gap-2">
      <span className="font-mono text-[10px] text-muted-foreground">
        {String(index).padStart(2, "0")}
      </span>
      <h2 className="flex-1 font-mono text-[11px] font-medium tracking-[0.06em] uppercase">{title}</h2>
      {children}
      <span
        className={cn(
          "flex size-4 items-center justify-center rounded-full transition-colors",
          done ? "bg-green-600 text-white" : "border border-zinc-300"
        )}
        aria-label={done ? "Entered" : "Not entered"}
      >
        {done && <Check className="size-2.5" strokeWidth={3} />}
      </span>
    </div>
  );
}

function NumberField({
  id,
  label,
  unit,
  value,
  onChange,
  placeholder,
  step,
  invalid,
}: {
  id: string;
  label: string;
  unit: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  step: string;
  invalid?: boolean;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex h-[52px] min-w-0 flex-1 items-center overflow-hidden rounded-md border bg-background transition-[border-color,box-shadow] focus-within:border-brand focus-within:ring-[3px] focus-within:ring-brand/15",
        invalid && "border-red-400"
      )}
    >
      <span className="sr-only">{label}</span>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        step={step}
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-full min-w-0 flex-1 bg-transparent px-3 text-right font-mono text-[22px] tracking-tight outline-none placeholder:text-zinc-300 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <span className="pr-3 font-mono text-[11px] text-muted-foreground uppercase">{unit}</span>
    </label>
  );
}

function ContextRow({ left, right, tone }: { left: React.ReactNode; right?: React.ReactNode; tone?: "warning" }) {
  return (
    <div
      className={cn(
        "flex justify-between gap-3 font-mono text-[11px] text-zinc-600",
        tone === "warning" && "text-amber-700"
      )}
    >
      <span className="min-w-0 truncate">{left}</span>
      {right && <span className="shrink-0">{right}</span>}
    </div>
  );
}

export function DailyRoundForm({ context, todayLabel, now }: DailyRoundFormProps) {
  const router = useRouter();
  const { meters, reservoirs } = context;

  const [meterId, setMeterId] = useState(meters[0]?.id ?? "");
  const [meterValue, setMeterValue] = useState("");
  const [chlorineValue, setChlorineValue] = useState("");
  const [reservoirId, setReservoirId] = useState(reservoirs[0]?.id ?? "");
  const [reservoirValue, setReservoirValue] = useState("");
  const [note, setNote] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Meter photo capture: a reading taken from a photo is saved with the photo's time
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedAt, setCapturedAt] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<"close" | "retake" | null>(null);

  const meter = meters.find((m) => m.id === meterId);
  const reservoir = reservoirs.find((r) => r.id === reservoirId);

  // Meter
  const meterNum = parseEntry(meterValue);
  const meterInvalid = meterValue !== "" && (meterNum === null || meterNum <= 0);
  const meterDelta = meterNum !== null && meter?.last ? meterNum - meter.last.value : null;

  // Chlorine
  const chlorineNum = parseEntry(chlorineValue);
  const chlorineInvalid =
    chlorineValue !== "" && (chlorineNum === null || chlorineNum < 0 || chlorineNum > CHLORINE_LIMIT);
  const chlorineShown = chlorineNum ?? context.chlorine?.value ?? null;
  const chlorineStatus =
    chlorineNum === null || chlorineInvalid
      ? null
      : chlorineNum < CHLORINE_MIN
        ? "LOW"
        : chlorineNum > CHLORINE_MAX
          ? "HIGH"
          : "IN RANGE";

  // Reservoir
  const reservoirNum = parseEntry(reservoirValue);
  const reservoirInvalid = reservoirValue !== "" && (reservoirNum === null || reservoirNum < 0);
  const maxLevel = reservoir?.max_level_inches ?? null;
  const reservoirShown = reservoirNum ?? reservoir?.last?.value ?? null;
  const reservoirPercent =
    reservoirShown !== null && maxLevel ? Math.min(100, Math.max(0, (reservoirShown / maxLevel) * 100)) : null;

  const entered: Record<Kind, boolean> = {
    meter: !!meter && meterNum !== null && !meterInvalid,
    chlorine: chlorineNum !== null && !chlorineInvalid,
    reservoir: !!reservoir && reservoirNum !== null && !reservoirInvalid,
  };
  const sections: Kind[] = [
    ...(meters.length > 0 ? (["meter"] as const) : []),
    "chlorine",
    ...(reservoirs.length > 0 ? (["reservoir"] as const) : []),
  ];
  const enteredCount = sections.filter((k) => entered[k]).length;
  const hasInvalid = meterInvalid || chlorineInvalid || reservoirInvalid;

  const stepReservoir = (direction: 1 | -1) => {
    const base = reservoirNum ?? reservoir?.last?.value ?? 0;
    setReservoirValue(String(Math.max(0, base + direction * RESERVOIR_STEP_IN)));
  };

  const closeCamera = () => {
    setShowCamera(false);
    setCapturedImage(null);
    setCapturedAt(null);
  };
  const retake = () => {
    setCapturedImage(null);
    setCapturedAt(null);
  };
  // Leaving a capture clears its timestamp; confirm if a value was read from it
  const requestClose = () => (capturedImage && meterValue ? setConfirmAction("close") : closeCamera());
  const requestRetake = () => (capturedImage && meterValue ? setConfirmAction("retake") : retake());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredCount === 0 || hasInvalid) return;
    setSaving(true);

    const recordedAt = new Date().toISOString();
    const notes = note.trim() || undefined;
    const tasks: { kind: Kind; label: string; run: () => Promise<{ success: boolean; error?: string }> }[] = [];
    if (entered.meter) {
      tasks.push({
        kind: "meter",
        label: "Meter",
        run: () =>
          insertMeterReading({
            meterId,
            readingValue: meterNum!,
            recordedAt: capturedAt || recordedAt,
            notes,
          }),
      });
    }
    if (entered.chlorine) {
      tasks.push({
        kind: "chlorine",
        label: "Chlorine",
        run: () => insertChlorineReading({ residualLevel: chlorineNum!, recordedAt, notes }),
      });
    }
    if (entered.reservoir) {
      tasks.push({
        kind: "reservoir",
        label: "Reservoir",
        run: () =>
          insertReservoirReading({
            reservoirId,
            levelInches: reservoirNum!,
            levelPercent: maxLevel ? Math.min(100, (reservoirNum! / maxLevel) * 100) : undefined,
            recordedAt,
            notes,
          }),
      });
    }

    try {
      const results = await Promise.all(
        tasks.map(async (task) => {
          try {
            return { task, result: await task.run() };
          } catch {
            return { task, result: { success: false, error: "Unexpected error" } };
          }
        })
      );

      // Clear what saved; keep failures in place to retry
      const failed = results.filter((r) => !r.result.success);
      for (const { task, result } of results) {
        if (!result.success) continue;
        if (task.kind === "meter") {
          setMeterValue("");
          closeCamera();
        } else if (task.kind === "chlorine") {
          setChlorineValue("");
        } else {
          setReservoirValue("");
        }
      }

      const saved = results.length - failed.length;
      if (saved > 0) {
        toast.success(`Recorded ${saved} ${saved === 1 ? "reading" : "readings"}`);
        router.refresh();
      }
      if (failed.length === 0) {
        setNote("");
        setNoteOpen(false);
      } else {
        toast.error(
          failed.map((f) => `${f.task.label}: ${f.result.error || "failed to save"}`).join("\n")
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const summary = [
    entered.meter && `MTR ${meterNum!.toLocaleString()}`,
    entered.chlorine && `CL₂ ${chlorineNum!.toFixed(2)}`,
    entered.reservoir && `RES ${reservoirNum}`,
  ].filter(Boolean);
  const skipped = sections.filter((k) => !entered[k]).map((k) => ({ meter: "METER", chlorine: "CL₂", reservoir: "RES" })[k]);

  let sectionIndex = 0;

  return (
    <form data-bleed onSubmit={handleSubmit} className="flex flex-1 flex-col">
      <div className="w-full max-w-xl flex-1 lg:border-r">
        {/* Round header */}
        <div className="flex flex-col gap-2 px-4 pt-3 pb-2.5">
          <div className="flex items-baseline gap-2">
            <span className="flex-1 font-mono text-[10px] tracking-[0.08em] text-muted-foreground">
              DAILY ROUND · {todayLabel}
            </span>
            <span className="font-mono text-[11px] text-zinc-700">
              {enteredCount} / {sections.length} ENTERED
            </span>
          </div>
          <div className="flex gap-[3px]" aria-hidden="true">
            {sections.map((k) => (
              <div key={k} className={cn("h-[3px] flex-1 transition-colors", entered[k] ? "bg-brand" : "bg-zinc-200")} />
            ))}
          </div>
        </div>

        {/* Meter */}
        {meter && (
          <section aria-label="Meter reading" className="flex flex-col gap-2 border-t px-4 py-3">
            <SectionHeader index={++sectionIndex} title="Meter" done={entered.meter}>
              {meters.length > 1 ? (
                <Select value={meterId} onValueChange={setMeterId}>
                  <SelectTrigger size="sm" className="!h-7 max-w-[60%] px-2 text-xs" aria-label="Meter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {meters.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="truncate text-xs text-zinc-700">{meter.name}</span>
              )}
            </SectionHeader>
            <div className="flex gap-1.5">
              <NumberField
                id="round-meter"
                label={`${meter.name} reading in gallons`}
                unit="gal"
                step="0.01"
                value={meterValue}
                onChange={setMeterValue}
                placeholder={meter.last ? meter.last.value.toLocaleString() : "0.00"}
                invalid={meterInvalid}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-pressed={showCamera}
                onClick={() => (showCamera ? requestClose() : setShowCamera(true))}
                className={cn("size-[52px] shrink-0", showCamera && "border-brand text-brand")}
              >
                {showCamera ? <X className="size-5" /> : <Camera className="size-5" strokeWidth={1.75} />}
                <span className="sr-only">{showCamera ? "Close camera" : "Read meter with camera"}</span>
              </Button>
            </div>
            {showCamera && (
              <CameraCapture
                capturedImage={capturedImage}
                onCapture={(dataUrl, ts) => {
                  setCapturedImage(dataUrl);
                  setCapturedAt(ts);
                }}
                onRequestRetake={requestRetake}
                onRequestClose={requestClose}
              />
            )}
            <ContextRow
              left={<PreviousLine last={meter.last} digits={2} now={now} />}
              right={
                meterDelta !== null
                  ? `Δ ${meterDelta >= 0 ? "+" : "−"}${Math.abs(meterDelta).toLocaleString(undefined, { maximumFractionDigits: 2 })} GAL`
                  : "Δ —"
              }
            />
            {meterDelta !== null && meterDelta < 0 && (
              <ContextRow tone="warning" left="Lower than the previous reading — check the digits" />
            )}
            {capturedAt && (
              <ContextRow left={`Saved with photo time · ${getLogDateParts(capturedAt).time}`} />
            )}
          </section>
        )}

        {/* Chlorine */}
        <section aria-label="Chlorine reading" className="flex flex-col gap-2 border-t px-4 py-3">
          <SectionHeader index={++sectionIndex} title="Chlorine residual" done={entered.chlorine} />
          <NumberField
            id="round-chlorine"
            label="Chlorine residual in milligrams per liter"
            unit="mg/L"
            step="0.01"
            value={chlorineValue}
            onChange={setChlorineValue}
            placeholder={context.chlorine ? context.chlorine.value.toFixed(2) : "0.00"}
            invalid={chlorineInvalid}
          />
          <div className="relative h-2.5" aria-hidden="true">
            <div className="absolute inset-x-0 top-1 h-0.5 bg-zinc-200" />
            <div
              className="absolute top-1 right-0 h-0.5 bg-green-300"
              style={{ left: `${(CHLORINE_MIN / CHLORINE_SCALE_MAX) * 100}%` }}
            />
            {chlorineShown !== null && (
              <div
                className={cn(
                  "absolute top-0 h-2.5 w-0.5 -translate-x-1/2",
                  chlorineNum === null ? "bg-zinc-400" : "bg-foreground"
                )}
                style={{ left: `${Math.min(100, (chlorineShown / CHLORINE_SCALE_MAX) * 100)}%` }}
              />
            )}
          </div>
          <ContextRow
            left={`SAFE ${CHLORINE_MIN.toFixed(2)}–${CHLORINE_MAX.toFixed(2)}`}
            right={chlorineStatus ?? <PreviousLine last={context.chlorine} digits={2} now={now} />}
            tone={chlorineStatus && chlorineStatus !== "IN RANGE" ? "warning" : undefined}
          />
          {chlorineInvalid && <ContextRow tone="warning" left={`Must be between 0 and ${CHLORINE_LIMIT}`} />}
        </section>

        {/* Reservoir */}
        {reservoir && (
          <section aria-label="Reservoir reading" className="flex flex-col gap-2 border-t px-4 py-3">
            <SectionHeader index={++sectionIndex} title="Reservoir" done={entered.reservoir}>
              {reservoirs.length > 1 ? (
                <Select value={reservoirId} onValueChange={setReservoirId}>
                  <SelectTrigger size="sm" className="!h-7 px-2 font-mono text-xs" aria-label="Reservoir">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {reservoirs.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                        {r.max_level_inches ? ` · max ${r.max_level_inches} in` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="font-mono text-xs text-zinc-700">
                  {reservoir.name}
                  {maxLevel ? ` · MAX ${maxLevel}` : ""}
                </span>
              )}
            </SectionHeader>
            <div className="flex gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-[52px] shrink-0"
                onClick={() => stepReservoir(-1)}
              >
                <Minus className="size-5" />
                <span className="sr-only">Decrease level by {RESERVOIR_STEP_IN} inch</span>
              </Button>
              <NumberField
                id="round-reservoir"
                label={`${reservoir.name} water level in inches`}
                unit="in"
                step="0.1"
                value={reservoirValue}
                onChange={setReservoirValue}
                placeholder={reservoir.last ? String(reservoir.last.value) : "0"}
                invalid={reservoirInvalid}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-[52px] shrink-0"
                onClick={() => stepReservoir(1)}
              >
                <Plus className="size-5" />
                <span className="sr-only">Increase level by {RESERVOIR_STEP_IN} inch</span>
              </Button>
            </div>
            {reservoirPercent !== null && (
              <div className="flex gap-0.5" aria-hidden="true">
                {Array.from({ length: TANK_SEGMENTS }, (_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-1.5 flex-1 transition-colors",
                      i < Math.round((reservoirPercent / 100) * TANK_SEGMENTS)
                        ? reservoirNum === null
                          ? "bg-zinc-400"
                          : "bg-brand"
                        : "bg-zinc-200"
                    )}
                  />
                ))}
              </div>
            )}
            <ContextRow
              left={<PreviousLine last={reservoir.last} digits={1} now={now} />}
              right={reservoirPercent !== null && reservoirNum !== null ? `${reservoirPercent.toFixed(0)}% CAPACITY` : undefined}
            />
            {maxLevel !== null && reservoirNum !== null && reservoirNum > maxLevel && (
              <ContextRow tone="warning" left={`Above the max level of ${maxLevel} in`} />
            )}
          </section>
        )}

        {/* Note */}
        <div className="border-t px-4 py-1">
          {noteOpen ? (
            <label className="flex flex-col gap-1.5 py-2">
              <span className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground">
                NOTE · SAVED WITH EACH READING IN THIS ROUND
              </span>
              <textarea
                autoFocus
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Anything unusual?"
                className="resize-none rounded-md border px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </label>
          ) : (
            <button
              type="button"
              onClick={() => setNoteOpen(true)}
              className="flex h-11 items-center gap-2 text-xs text-zinc-600 hover:text-foreground"
            >
              <Plus className="size-3.5" />
              Add a note to this round
            </button>
          )}
        </div>
      </div>

      {/* Submit */}
      <div className="sticky bottom-0 z-10 border-t bg-sidebar px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex max-w-xl flex-col gap-2 lg:max-w-[calc(36rem-2rem)]">
          <div className="flex justify-between gap-3 font-mono text-[11px] text-zinc-600">
            <span className="truncate">{summary.length > 0 ? summary.join(" · ") : "NOTHING ENTERED YET"}</span>
            {summary.length > 0 && skipped.length > 0 && (
              <span className="shrink-0">{skipped.join(", ")} SKIPPED</span>
            )}
          </div>
          <Button
            type="submit"
            disabled={saving || enteredCount === 0 || hasInvalid}
            className="h-12 text-[15px]"
          >
            {saving
              ? "Saving…"
              : enteredCount === 0
                ? "Record readings"
                : `Record ${enteredCount} ${enteredCount === 1 ? "reading" : "readings"}`}
          </Button>
        </div>
      </div>

      <AlertDialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard the capture time?</AlertDialogTitle>
            <AlertDialogDescription>
              You&apos;ve entered a reading value from the captured image. Leaving this capture
              will clear its timestamp, so the reading would be saved with the current time
              instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmAction === "close") closeCamera();
                else retake();
                setConfirmAction(null);
              }}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
