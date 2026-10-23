"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { format, parseISO } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { MonthNavigation } from "@/components/reports/month-navigation";
import { ReportsTable, roundChlorine } from "@/components/reports/reports-table";
import { ExportExcelButton } from "@/components/reports/export-excel-button";
import type { MonthlyReportData } from "@/lib/actions/reports";

const CHLORINE_MIN = 0.2;
const CHLORINE_MAX = 4.0;

interface ReportsViewProps {
  data: MonthlyReportData;
  month: string;
  meterId: string;
  canEdit: boolean;
}

function Stat({ label, value, note }: { label: string; value: React.ReactNode; note?: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 basis-[150px] flex-col gap-0.5 border-r border-b px-4 py-2.5 last:border-r-0">
      <span className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">{label}</span>
      <span className="font-mono text-lg leading-tight font-medium tracking-tight">{value}</span>
      {note && <span className="font-mono text-[11px] text-zinc-600 uppercase">{note}</span>}
    </div>
  );
}

export function ReportsView({ data, month, meterId, canEdit }: ReportsViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const updateUrl = (params: Record<string, string>) => {
    const url = new URL(window.location.href);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    startTransition(() => router.push(url.pathname + url.search));
  };

  // Month summary
  const usageDays = data.days.filter((d) => d.dailyUsage !== null);
  const totalUsage = usageDays.reduce((sum, d) => sum + d.dailyUsage!, 0);
  const peak = usageDays.reduce<(typeof usageDays)[number] | null>(
    (best, d) => (best === null || d.dailyUsage! > best.dailyUsage! ? d : best),
    null
  );
  const chlorine = data.days.map(roundChlorine).filter((v): v is number => v !== null);
  const chlorineOut = chlorine.filter((v) => v < CHLORINE_MIN || v > CHLORINE_MAX).length;
  const estimatedDays = data.days.filter(
    (d) =>
      (d.isMeterInterpolated && d.meterAverage !== null) ||
      (d.isChlorineInterpolated && d.chlorineAverage !== null)
  ).length;
  const fmt = (n: number) => Math.round(n).toLocaleString();

  return (
    <div data-flush className={cn("flex min-h-full flex-col transition-opacity", isPending && "opacity-60")}>
      <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b bg-background px-4 py-2">
        <MonthNavigation currentMonth={month} availableMonths={data.availableMonths} />

        {data.meters.length > 1 ? (
          <Select value={meterId} onValueChange={(value) => updateUrl({ meterId: value })} disabled={isPending}>
            <SelectTrigger size="sm" className="!h-7 px-2 text-xs" aria-label="Meter">
              <SelectValue placeholder="Select meter" />
            </SelectTrigger>
            <SelectContent>
              {data.meters.map((meter) => (
                <SelectItem key={meter.id} value={meter.id}>
                  {meter.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-xs text-zinc-700">{data.meters[0]?.name}</span>
        )}

        <div className="flex-1" />
        <ExportExcelButton days={data.days} month={month} carryTotal={data.carryTotal} />
      </div>

      <section aria-label="Month summary" className="flex flex-wrap">
        <Stat
          label="Produced · gal"
          value={usageDays.length > 0 ? fmt(totalUsage) : "—"}
          note={usageDays.length > 0 ? `${usageDays.length} days` : undefined}
        />
        <Stat
          label="Avg · gal/day"
          value={usageDays.length > 0 ? fmt(totalUsage / usageDays.length) : "—"}
          note={peak ? `Peak ${fmt(peak.dailyUsage!)} · ${format(parseISO(peak.date), "MMM d")}` : undefined}
        />
        <Stat
          label="Chlorine · mg/L"
          value={
            chlorine.length > 0
              ? (chlorine.reduce((a, b) => a + b, 0) / chlorine.length).toFixed(2)
              : "—"
          }
          note={
            chlorine.length > 0
              ? `${Math.min(...chlorine).toFixed(2)}–${Math.max(...chlorine).toFixed(2)} · ${
                  chlorineOut === 0 ? "all in range" : `${chlorineOut} out of range`
                }`
              : undefined
          }
        />
        <Stat
          label="Estimated days"
          value={estimatedDays}
          note={estimatedDays > 0 ? (canEdit ? "Review with ✓ to accept" : "Interpolated values") : "All measured"}
        />
      </section>

      <ReportsTable days={data.days} canEdit={canEdit} meterId={meterId} carryTotal={data.carryTotal} />
    </div>
  );
}
