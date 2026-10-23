"use client";

import { parseISO, format } from "date-fns";
import { cn } from "@/lib/utils";
import { AcceptValueButton } from "./accept-value-button";
import type { ReportDayData } from "@/lib/actions/reports";

// Thresholds match the dashboard and alerts
const CHLORINE_MIN = 0.2;
const CHLORINE_MAX = 4.0;

interface ReportsTableProps {
  days: ReportDayData[];
  canEdit: boolean;
  meterId: string;
  carryTotal: number | null;
}

const thClass =
  "border-b bg-zinc-50 px-2 py-1.5 text-left font-mono text-[10px] font-medium tracking-[0.06em] whitespace-nowrap text-muted-foreground uppercase first:pl-4 last:pr-4";
const tdClass = "px-2 py-[6px] first:pl-4 last:pr-4";

function Dash() {
  return <span className="font-mono text-muted-foreground">—</span>;
}

/** An estimated (interpolated) value: amber text, an EST tag and, for editors, accept */
function Estimated({ children, accept }: { children: React.ReactNode; accept?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center justify-end gap-1.5">
      <span
        className="rounded-sm bg-amber-50 px-1 font-mono text-[10px] text-amber-800"
        title="Estimated from surrounding readings"
      >
        EST
      </span>
      <span className="font-mono text-amber-800">{children}</span>
      {accept}
    </span>
  );
}

// Interpolated chlorine values are rounded to the 0.2 mg/L steps the test kit reads in
export const roundChlorine = (day: ReportDayData) =>
  day.chlorineAverage !== null && day.isChlorineInterpolated
    ? Math.round(day.chlorineAverage / 0.2) * 0.2
    : day.chlorineAverage;

export function ReportsTable({ days, canEdit, meterId, carryTotal }: ReportsTableProps) {
  const hasAnyMeterData = days.some((d) => d.meterAverage !== null);
  const hasAnyChlorineData = days.some((d) => d.chlorineAverage !== null);

  if (!hasAnyMeterData && !hasAnyChlorineData) {
    return (
      <p className="px-4 py-16 text-center text-xs text-muted-foreground">
        No readings recorded for this month. Try a different month or meter.
      </p>
    );
  }

  const maxDaily = Math.max(0, ...days.map((d) => d.dailyUsage ?? 0));
  const totalUsage = days.reduce((sum, d) => sum + (d.dailyUsage ?? 0), 0);
  const chlorineValues = days.map(roundChlorine).filter((v): v is number => v !== null);
  const chlorineAvg =
    chlorineValues.length > 0 ? chlorineValues.reduce((a, b) => a + b, 0) / chlorineValues.length : null;

  return (
    <div className="relative overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className={thClass}>Date</th>
            <th className={cn(thClass, "text-right")}>Meter · gal</th>
            <th className={cn(thClass, "text-right")}>Daily usage · gal</th>
            <th className={cn(thClass, "w-[22%] min-w-24")}>
              <span className="sr-only">Daily usage bar</span>
            </th>
            <th className={cn(thClass, "text-right")}>Chlorine · mg/L</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b bg-zinc-50/60">
            <td className={cn(tdClass, "font-mono text-[10px] tracking-[0.06em] text-zinc-600 uppercase")}>
              Carry total
            </td>
            <td className={cn(tdClass, "text-right font-mono")}>
              {carryTotal !== null ? carryTotal.toLocaleString() : <Dash />}
            </td>
            <td className={tdClass} />
            <td className={tdClass} />
            <td className={tdClass} />
          </tr>

          {days.map((day) => {
            const date = parseISO(day.date);
            const weekend = date.getDay() === 0 || date.getDay() === 6;
            const chlorine = roundChlorine(day);
            const chlorineTone =
              chlorine === null
                ? null
                : chlorine < CHLORINE_MIN
                  ? "bg-red-600"
                  : chlorine > CHLORINE_MAX
                    ? "bg-amber-500"
                    : "bg-green-600";

            return (
              <tr key={day.date} className="border-b border-zinc-100 transition-colors hover:bg-zinc-50/70">
                <td className={cn(tdClass, "font-mono whitespace-nowrap")}>
                  {day.date}{" "}
                  <span className={cn("text-[10px] uppercase", weekend ? "text-zinc-400" : "text-muted-foreground")}>
                    {format(date, "EEE")}
                  </span>
                </td>

                <td className={cn(tdClass, "text-right whitespace-nowrap")}>
                  {day.meterAverage === null ? (
                    <Dash />
                  ) : day.isMeterInterpolated ? (
                    <Estimated
                      accept={
                        canEdit && (
                          <AcceptValueButton type="meter" date={day.date} value={day.meterAverage} meterId={meterId} />
                        )
                      }
                    >
                      {day.meterAverage.toLocaleString()}
                    </Estimated>
                  ) : (
                    <span className="font-mono">{day.meterAverage.toLocaleString()}</span>
                  )}
                </td>

                <td className={cn(tdClass, "text-right whitespace-nowrap")}>
                  {day.dailyUsage === null ? (
                    <Dash />
                  ) : day.isDailyUsageInterpolated ? (
                    <Estimated>{day.dailyUsage.toLocaleString()}</Estimated>
                  ) : (
                    <span className="font-mono">{day.dailyUsage.toLocaleString()}</span>
                  )}
                </td>

                <td className={tdClass}>
                  {day.dailyUsage !== null && maxDaily > 0 && (
                    <div className="h-2 w-full bg-zinc-100" aria-hidden="true">
                      <div
                        className={cn("h-full", day.isDailyUsageInterpolated ? "bg-amber-300" : "bg-brand")}
                        style={{ width: `${(day.dailyUsage / maxDaily) * 100}%` }}
                      />
                    </div>
                  )}
                </td>

                <td className={cn(tdClass, "text-right whitespace-nowrap")}>
                  {chlorine === null ? (
                    <Dash />
                  ) : (
                    <span className="inline-flex items-center justify-end gap-1.5">
                      {day.isChlorineInterpolated ? (
                        <Estimated
                          accept={
                            canEdit && <AcceptValueButton type="chlorine" date={day.date} value={chlorine} />
                          }
                        >
                          {chlorine.toFixed(2)}
                        </Estimated>
                      ) : (
                        <span className="font-mono">{chlorine.toFixed(2)}</span>
                      )}
                      <span className={cn("size-1.5 rounded-full", chlorineTone)} aria-hidden="true" />
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t bg-zinc-50/60 font-mono">
            <td className={cn(tdClass, "text-[10px] tracking-[0.06em] text-zinc-600 uppercase")}>Month</td>
            <td className={tdClass} />
            <td className={cn(tdClass, "text-right font-medium")}>{totalUsage.toLocaleString()}</td>
            <td className={cn(tdClass, "text-[10px] text-muted-foreground uppercase")}>Total</td>
            <td className={cn(tdClass, "text-right")}>
              {chlorineAvg !== null ? (
                <>
                  <span className="text-[10px] text-muted-foreground">AVG </span>
                  {chlorineAvg.toFixed(2)}
                </>
              ) : (
                <Dash />
              )}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
