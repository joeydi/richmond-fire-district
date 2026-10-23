import Link from "next/link";
import { getLogDateParts } from "@/components/log/log-dates";

export interface DashboardReading {
  id: string;
  type: "meter" | "chlorine" | "reservoir";
  value: number;
  unit: string;
  recorded_at: string;
  location_name: string | null;
  /** Gallons since this meter's previous reading */
  delta?: number | null;
  /** Pump flow from a back-to-back reading pair */
  production_rate?: number | null;
  interpolated?: boolean;
}

interface RecentReadingsProps {
  readings: DashboardReading[];
}

const typeCodes: Record<DashboardReading["type"], string> = {
  meter: "MTR",
  chlorine: "CL₂",
  reservoir: "RES",
};

const valueDigits: Record<DashboardReading["type"], number> = {
  meter: 2,
  chlorine: 2,
  reservoir: 1,
};

function formatValue(reading: DashboardReading) {
  const digits = valueDigits[reading.type];
  return reading.value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

const thClass =
  "border-y bg-zinc-50 px-2 py-1.5 text-left font-mono text-[10px] font-medium tracking-[0.06em] text-muted-foreground";

export function RecentReadings({ readings }: RecentReadingsProps) {
  return (
    <section aria-label="Recent readings" className="min-w-0">
      <div className="flex h-9 items-center gap-2.5 px-4">
        <h2 className="text-[13px] font-semibold">Readings</h2>
        <span className="font-mono text-[11px] text-muted-foreground">LATEST {readings.length}</span>
        <div className="flex-1" />
        <Link
          href="/dashboard/readings/meter"
          className="font-mono text-[11px] text-zinc-600 hover:text-foreground"
        >
          ALL →
        </Link>
      </div>
      {readings.length === 0 ? (
        <p className="border-t px-4 py-8 text-center text-xs text-muted-foreground">
          No readings recorded yet
        </p>
      ) : (
        <div className="relative overflow-x-auto">
          <table className="w-full border-collapse font-mono text-xs">
            <thead>
              <tr>
                <th className={`${thClass} pl-4`}>DATE</th>
                <th className={thClass}>TYPE</th>
                <th className={thClass}>SOURCE</th>
                <th className={`${thClass} text-right`}>VALUE</th>
                <th className={`${thClass} text-right`}>Δ</th>
                <th className={`${thClass} pr-4`}>
                  <span className="sr-only">Notes</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {readings.map((reading) => {
                const { date, time } = getLogDateParts(reading.recorded_at);
                return (
                  <tr key={`${reading.type}-${reading.id}`} className="border-b border-zinc-100">
                    <td className="py-[7px] pr-2 pl-4 whitespace-nowrap text-zinc-600">
                      {date} <span className="text-muted-foreground">{time}</span>
                    </td>
                    <td className="px-2">
                      <span className="rounded-sm border px-1 text-[10px] text-zinc-700">
                        {typeCodes[reading.type]}
                      </span>
                    </td>
                    <td className="px-2 font-sans whitespace-nowrap">{reading.location_name ?? "—"}</td>
                    <td className="px-2 text-right whitespace-nowrap">
                      {formatValue(reading)}{" "}
                      <span className="text-[10px] text-muted-foreground">{reading.unit}</span>
                    </td>
                    <td className="px-2 text-right whitespace-nowrap text-zinc-600">
                      {reading.delta != null
                        ? `+${reading.delta.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                        : "—"}
                    </td>
                    <td className="pr-4 pl-2 whitespace-nowrap">
                      <div className="flex justify-end gap-1">
                        {reading.production_rate != null && (
                          <span
                            className="rounded-sm bg-brand/10 px-1 text-[10px] text-cyan-900"
                            title="Pump flow from back-to-back readings"
                          >
                            {reading.production_rate.toFixed(2)} GPM
                          </span>
                        )}
                        {reading.interpolated && (
                          <span
                            className="rounded-sm bg-muted px-1 text-[10px] text-zinc-600"
                            title="Estimated from surrounding readings"
                          >
                            INTERP
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
