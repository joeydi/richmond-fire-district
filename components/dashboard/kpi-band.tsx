import { cn } from "@/lib/utils";
import { getLogDateParts } from "@/components/log/log-dates";
import { summarizeRates, type RateData } from "@/lib/usage";

// Thresholds match the alerts used elsewhere in the app
const CHLORINE_MIN = 0.2;
const CHLORINE_MAX = 4.0;
const CHLORINE_SCALE_MAX = 4.0;
const RESERVOIR_CRITICAL_IN = 25;
const RESERVOIR_WARNING_IN = 50;
const TANK_SEGMENTS = 20;
const SPARK_W = 88;
const SPARK_H = 26;

type Tone = "neutral" | "good" | "warning" | "critical";

interface KpiBandProps {
  stats: {
    latestReadingAt: string | null;
    latestProductionRate: number | null;
    latestProductionMeter: string | null;
    latestChlorine: number | null;
    reservoirLevel: number | null;
    reservoirName: string | null;
    reservoirMaxInches: number | null;
    latestPumpRateGpm: number | null;
  };
  /** Daily production rates, oldest first; the last 30 drive the sparkline and average */
  rates: RateData[];
  /** Request time in ms, for "since last reading" */
  now: number;
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
      {children}
    </span>
  );
}

function Value({ children, unit }: { children: React.ReactNode; unit?: string }) {
  return (
    <div className="flex items-baseline gap-1">
      <span className="font-mono text-[26px] leading-[1.1] font-medium tracking-tight">
        {children}
      </span>
      {unit && <span className="font-mono text-xs text-muted-foreground">{unit}</span>}
    </div>
  );
}

function Chip({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "rounded-sm px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-[0.06em] uppercase",
        tone === "good" && "bg-green-50 text-green-800",
        tone === "warning" && "bg-amber-100 text-amber-800",
        tone === "critical" && "bg-red-100 text-red-800",
        tone === "neutral" && "bg-muted text-zinc-700"
      )}
    >
      {children}
    </span>
  );
}

function Footnote({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-[11px] text-zinc-600 uppercase">{children}</span>;
}

function Cell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 basis-[168px] flex-col gap-1 border-r border-b px-4 py-3 last:border-r-0 lg:basis-56">
      {children}
    </div>
  );
}

function formatAge(iso: string, now: number): string {
  const minutes = Math.floor((now - new Date(iso).getTime()) / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function KpiBand({ stats, rates, now }: KpiBandProps) {
  // Production
  const recent = rates.slice(-30).map((r) => r.rate);
  const summary = summarizeRates(recent);
  const vsAvg =
    summary && stats.latestProductionRate !== null && summary.avg > 0
      ? ((stats.latestProductionRate - summary.avg) / summary.avg) * 100
      : null;
  const spark =
    summary && recent.length > 1
      ? recent
          .map((r, i) => {
            const x = (i / (recent.length - 1)) * SPARK_W;
            const y =
              SPARK_H - 2 - ((r - summary.min) / (summary.max - summary.min || 1)) * (SPARK_H - 4);
            return `${x.toFixed(1)},${y.toFixed(1)}`;
          })
          .join(" ")
      : null;

  // Chlorine
  const chlorine = stats.latestChlorine;
  const chlorineTone: Tone =
    chlorine === null ? "neutral" : chlorine < CHLORINE_MIN ? "critical" : chlorine > CHLORINE_MAX ? "warning" : "good";
  const chlorineLabel =
    chlorine === null ? "No data" : chlorine < CHLORINE_MIN ? "Low" : chlorine > CHLORINE_MAX ? "High" : "In range";
  const markerPercent =
    chlorine === null ? null : Math.min(100, Math.max(0, (chlorine / CHLORINE_SCALE_MAX) * 100));

  // Reservoir
  const level = stats.reservoirLevel;
  const max = stats.reservoirMaxInches;
  const fillPercent = level !== null && max ? Math.min(100, (level / max) * 100) : null;
  const filledSegments = fillPercent === null ? 0 : Math.round((fillPercent / 100) * TANK_SEGMENTS);
  const reservoirTone: Tone =
    level === null
      ? "neutral"
      : level < RESERVOIR_CRITICAL_IN
        ? "critical"
        : level < RESERVOIR_WARNING_IN
          ? "warning"
          : "good";

  // Last reading
  const ageDays = stats.latestReadingAt
    ? Math.floor((now - new Date(stats.latestReadingAt).getTime()) / 86400000)
    : null;
  const last = stats.latestReadingAt ? getLogDateParts(stats.latestReadingAt) : null;

  return (
    <section aria-label="Key metrics" className="flex flex-wrap">
      <Cell>
        <Label>Production · gal/day</Label>
        <div className="flex items-end gap-3">
          <Value>{stats.latestProductionRate?.toLocaleString() ?? "—"}</Value>
          {spark && (
            <svg
              width={SPARK_W}
              height={SPARK_H}
              viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
              className="ml-auto shrink-0 text-brand"
              role="img"
              aria-label="Daily production, last 30 days"
            >
              <polyline points={spark} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <Footnote>
          {vsAvg !== null
            ? `${vsAvg >= 0 ? "▲" : "▼"} ${Math.abs(vsAvg).toFixed(1)}% vs 30d avg`
            : stats.latestProductionMeter ?? "No recent readings"}
          {stats.latestPumpRateGpm !== null && ` · Pump ${stats.latestPumpRateGpm.toFixed(2)} gpm`}
        </Footnote>
      </Cell>

      <Cell>
        <Label>Chlorine · mg/L</Label>
        <div className="flex items-center gap-2">
          <Value>{chlorine?.toFixed(2) ?? "—"}</Value>
          <Chip tone={chlorineTone}>{chlorineLabel}</Chip>
        </div>
        <div className="relative mt-1 h-3" aria-hidden="true">
          <div className="absolute inset-x-0 top-[5px] h-0.5 bg-zinc-200" />
          <div
            className="absolute top-[5px] right-0 h-0.5 bg-green-300"
            style={{ left: `${(CHLORINE_MIN / CHLORINE_SCALE_MAX) * 100}%` }}
          />
          {markerPercent !== null && (
            <div
              className="absolute top-0 h-3 w-0.5 -translate-x-1/2 bg-foreground"
              style={{ left: `${markerPercent}%` }}
            />
          )}
        </div>
        <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
          <span>0</span>
          <span>
            SAFE {CHLORINE_MIN.toFixed(2)}–{CHLORINE_MAX.toFixed(2)}
          </span>
          <span>{CHLORINE_SCALE_MAX}</span>
        </div>
      </Cell>

      <Cell>
        <Label>Reservoir{stats.reservoirName && ` ${stats.reservoirName}`} · in</Label>
        <div className="flex items-center gap-2">
          <Value unit={max ? `/ ${max}` : undefined}>{level?.toFixed(1) ?? "—"}</Value>
          {reservoirTone !== "good" && reservoirTone !== "neutral" && (
            <Chip tone={reservoirTone}>{reservoirTone === "critical" ? "Critical" : "Low"}</Chip>
          )}
        </div>
        {fillPercent !== null && (
          <div className="mt-1 flex gap-0.5" aria-hidden="true">
            {Array.from({ length: TANK_SEGMENTS }, (_, i) => (
              <div
                key={i}
                className={cn(
                  "h-2 flex-1",
                  i < filledSegments
                    ? reservoirTone === "critical"
                      ? "bg-red-500"
                      : reservoirTone === "warning"
                        ? "bg-amber-500"
                        : "bg-brand"
                    : "bg-zinc-200"
                )}
              />
            ))}
          </div>
        )}
        <Footnote>
          {fillPercent !== null ? `${fillPercent.toFixed(1)}% capacity` : "Capacity unknown"}
        </Footnote>
      </Cell>

      <Cell>
        <Label>Since last reading</Label>
        <div className="flex items-center gap-2">
          <Value>{stats.latestReadingAt ? formatAge(stats.latestReadingAt, now) : "—"}</Value>
          {ageDays !== null && ageDays >= 2 && <Chip tone="warning">Overdue</Chip>}
          {ageDays === 1 && <Chip tone="neutral">Due</Chip>}
        </div>
        <Footnote>{last ? `${last.date} ${last.time}` : "No readings yet"}</Footnote>
      </Cell>
    </section>
  );
}
