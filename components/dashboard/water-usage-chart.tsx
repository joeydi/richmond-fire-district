"use client";

import { useRef, useState } from "react";
import ReactECharts from "echarts-for-react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  calculateDailyRate,
  summarizeRates,
  type RateData,
  type UsageData,
} from "@/lib/usage";
import {
  startOfWeek,
  startOfMonth,
  format,
  differenceInDays,
  parseISO,
} from "date-fns";

// ECharts draws to SVG attributes, which can't read CSS variables or oklch
const BRAND = "#0891b2";
const INK = "#3f3f46";
const MUTED = "#63636b";
const GRID = "#ededf0";
const AXIS = "#d4d4d8";

interface WaterUsageChartProps {
  data: UsageData[];
  title?: string;
  meterName?: string | null;
  earliestDate?: string;
}

type DateRange = "7d" | "30d" | "90d" | "year" | "all" | "custom";

const RANGES: { value: DateRange; label: string }[] = [
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
  { value: "year", label: "YTD" },
  { value: "all", label: "ALL" },
  { value: "custom", label: "…" },
];

const fmt = (n: number) => Math.round(n).toLocaleString();

export function WaterUsageChart({
  data,
  title = "Water production",
  meterName,
  earliestDate,
}: WaterUsageChartProps) {
  const [range, setRange] = useState<DateRange>("30d");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [monoFont] = useState(() =>
    typeof document === "undefined"
      ? "monospace"
      : `${getComputedStyle(document.body).getPropertyValue("--font-geist-mono")}, monospace`
  );
  const chartRef = useRef<ReactECharts>(null);

  const { filteredData, dateRange } = filterDataByRange(
    data,
    range,
    customStart,
    customEnd,
    earliestDate
  );

  // Calculate daily usage rate (difference between consecutive readings)
  const rateData = calculateDailyRate(filteredData);

  // Determine grouping mode based on date range
  const groupingMode = getGroupingMode(dateRange.start, dateRange.end);

  // Group data by period (daily, weekly, or monthly)
  const groupedData = groupDataByPeriod(rateData, groupingMode);
  const summary = summarizeRates(groupedData.map((d) => d.rate));
  const unitLabel = groupingMode === "daily" ? "GAL/DAY" : `${groupingMode.toUpperCase()} AVG GAL/DAY`;

  const axisText = { color: MUTED, fontFamily: monoFont, fontSize: 10 };

  const option = {
    animationDuration: 300,
    grid: { left: 4, right: 20, top: 24, bottom: 4, containLabel: true },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: groupedData.map((d) => d.label),
      axisLine: { lineStyle: { color: AXIS } },
      axisTick: { show: false },
      axisLabel: { ...axisText, hideOverlap: true },
    },
    yAxis: {
      type: "value",
      scale: true,
      splitNumber: 4,
      axisLine: { show: false },
      axisLabel: { ...axisText, formatter: (v: number) => v.toLocaleString() },
      splitLine: { lineStyle: { color: GRID, type: "dashed" } },
    },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "line", lineStyle: { color: "#a1a1aa" } },
      backgroundColor: "#18181b",
      borderWidth: 0,
      padding: [6, 8],
      textStyle: { color: "#fff", fontFamily: monoFont, fontSize: 11 },
      formatter: (params: { dataIndex: number }[]) => {
        const item = groupedData[params?.[0]?.dataIndex];
        if (!item) return "";
        const diff = summary ? item.rate - summary.avg : 0;
        const lines = [
          `<span style="color:#a1a1aa">${item.label.toUpperCase()}</span>`,
          `${fmt(item.rate)} gal/day${groupingMode !== "daily" ? " avg" : ""}`,
          `<span style="color:#a1a1aa">${diff >= 0 ? "+" : "−"}${fmt(Math.abs(diff))} vs avg</span>`,
        ];
        if (groupingMode !== "daily") {
          lines.push(`<span style="color:#a1a1aa">${item.dataPoints} days</span>`);
        }
        return lines.join("<br/>");
      },
    },
    series: [
      {
        type: "line",
        name: "Production",
        data: groupedData.map((d) => Math.round(d.rate)),
        showSymbol: false,
        symbolSize: 7,
        lineStyle: { color: BRAND, width: 2 },
        itemStyle: { color: BRAND, borderColor: "#fff", borderWidth: 2 },
        areaStyle: { color: BRAND, opacity: 0.08 },
        markLine: summary
          ? {
              silent: true,
              symbol: "none",
              lineStyle: { color: "#71717a", type: "dashed", width: 1 },
              label: {
                position: "insideStartTop",
                formatter: `AVG ${fmt(summary.avg)}`,
                ...axisText,
                color: INK,
              },
              data: [{ yAxis: summary.avg }],
            }
          : undefined,
        markPoint:
          groupedData.length > 2
            ? {
                symbol: "circle",
                symbolSize: 7,
                itemStyle: { color: BRAND, borderColor: "#fff", borderWidth: 2 },
                label: { position: "top", distance: 6, ...axisText, color: INK, formatter: "{b}" },
                data: [
                  { type: "max", name: "MAX" },
                  { type: "min", name: "MIN" },
                ],
              }
            : undefined,
      },
    ],
  };

  const handleRangeChange = (value: DateRange) => {
    if (value === "custom" && range !== "custom") {
      // Pre-populate custom inputs with current preset dates
      setCustomStart(format(dateRange.start, "yyyy-MM-dd"));
      setCustomEnd(format(dateRange.end, "yyyy-MM-dd"));
    } else if (value !== "custom") {
      setCustomStart("");
      setCustomEnd("");
    }
    setRange(value);
  };

  const fileStem = `water-production-${format(dateRange.start, "yyyy-MM-dd")}-to-${format(dateRange.end, "yyyy-MM-dd")}`;

  const handleExportCsv = () => {
    const rows = [
      ["period_start", "gallons_per_day", "days", "readings"],
      ...groupedData.map((d) => [d.date, Math.round(d.rate), d.dataPoints, d.reading_count]),
    ];
    downloadBlob(
      new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" }),
      `${fileStem}.csv`
    );
  };

  const handleExportPng = async () => {
    const instance = chartRef.current?.getEchartsInstance();
    if (!instance) return;

    try {
      // The chart uses the SVG renderer, so getDataURL returns an SVG data URI.
      // Rasterize it through a canvas to produce a PNG.
      const svgUrl = instance.getDataURL({ type: "svg" });

      const image = await loadImage(svgUrl);

      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = instance.getWidth() * scale;
      canvas.height = instance.getHeight() * scale;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context unavailable");

      // The SVG background is transparent; fill white so the PNG reads well
      // when pasted into a document.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );
      if (!blob) throw new Error("Could not encode PNG");

      downloadBlob(blob, `${fileStem}.png`);
    } catch {
      toast.error("Could not export chart");
    }
  };

  return (
    <section aria-label={title} className="border-b px-4 pt-3 pb-2">
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 className="text-[13px] font-semibold">{title}</h2>
        <span className="font-mono text-[11px] text-muted-foreground uppercase">
          {[meterName, unitLabel, formatRangeLabel(dateRange.start, dateRange.end)]
            .filter(Boolean)
            .join(" · ")}
        </span>
        <div className="flex-1" />

        <div
          role="group"
          aria-label="Date range"
          className="flex gap-0.5 rounded-md bg-muted p-0.5 font-mono text-[11px]"
        >
          {RANGES.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={range === option.value}
              title={option.value === "custom" ? "Custom range" : undefined}
              onClick={() => handleRangeChange(option.value)}
              className={cn(
                "h-6 rounded-sm px-2 transition-colors",
                range === option.value
                  ? "bg-background font-medium text-foreground shadow-[0_0_0_1px_var(--border)]"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {range === "custom" && (
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <label className="sr-only" htmlFor="from-date">From</label>
            <input
              id="from-date"
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="h-7 rounded-md border px-1.5"
            />
            <span className="text-muted-foreground">→</span>
            <label className="sr-only" htmlFor="to-date">To</label>
            <input
              id="to-date"
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="h-7 rounded-md border px-1.5"
            />
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 font-mono text-[11px]"
              disabled={groupedData.length === 0}
            >
              <Download className="size-3.5" />
              EXPORT
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem onClick={handleExportCsv}>CSV data</DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportPng}>PNG image</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {summary && (
        <dl className="mb-2 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[11px]">
          {[
            ["MIN", fmt(summary.min)],
            ["AVG", fmt(summary.avg)],
            ["MAX", fmt(summary.max)],
            ["σ", fmt(summary.stdDev)],
            ...(groupingMode === "daily" ? [["Σ", `${fmt(summary.total)} GAL`]] : []),
          ].map(([label, value]) => (
            <div key={label} className="flex gap-1.5">
              <dt className="text-muted-foreground">{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {groupedData.length === 0 ? (
        <div className="flex h-[260px] items-center justify-center text-xs text-muted-foreground lg:h-[300px]">
          No data for this period
        </div>
      ) : (
        <div className="h-[260px] lg:h-[300px]">
          <ReactECharts
            ref={chartRef}
            option={option}
            notMerge
            style={{ height: "100%", width: "100%" }}
            opts={{ renderer: "svg" }}
          />
        </div>
      )}
    </section>
  );
}

function formatRangeLabel(start: Date, end: Date): string {
  const pattern = start.getFullYear() === end.getFullYear() ? "MMM d" : "MMM d, yyyy";
  return `${format(start, pattern)} – ${format(end, pattern)}`;
}

function downloadBlob(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  link.click();
  // Revoking in the same tick can cancel the download before it starts in
  // Safari; defer until after the click has been handled.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load chart image"));
    image.src = src;
  });
}

interface FilterResult {
  filteredData: UsageData[];
  dateRange: { start: Date; end: Date };
}

function filterDataByRange(
  data: UsageData[],
  range: DateRange,
  customStart?: string,
  customEnd?: string,
  earliestDate?: string
): FilterResult {
  const now = new Date();
  let cutoffStart: Date;
  let cutoffEnd: Date = now;

  // Helper to format date as YYYY-MM-DD in local time
  const toDateString = (date: Date): string => format(date, "yyyy-MM-dd");

  switch (range) {
    case "7d":
      cutoffStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      cutoffStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "90d":
      cutoffStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case "year":
      cutoffStart = new Date(now.getFullYear(), 0, 1);
      break;
    case "all":
      // Use earliest date from data, or fall back to 1 year ago
      if (earliestDate) {
        cutoffStart = parseISO(earliestDate);
      } else if (data.length > 0) {
        const dates = data.map((d) => new Date(d.date).getTime());
        cutoffStart = new Date(Math.min(...dates));
      } else {
        cutoffStart = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      }
      break;
    case "custom":
      if (!customStart || !customEnd) {
        return {
          filteredData: [],
          dateRange: { start: now, end: now },
        };
      }
      cutoffStart = parseISO(customStart);
      cutoffEnd = parseISO(customEnd);
      break;
    default:
      cutoffStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  // Compare as date strings (YYYY-MM-DD) to avoid timezone issues
  const cutoffStartStr = toDateString(cutoffStart);
  const cutoffEndStr = toDateString(cutoffEnd);

  const filteredData = data.filter((d) => {
    // d.date is already in YYYY-MM-DD format
    return d.date >= cutoffStartStr && d.date <= cutoffEndStr;
  });

  return {
    filteredData,
    dateRange: { start: cutoffStart, end: cutoffEnd },
  };
}

type GroupingMode = "daily" | "weekly" | "monthly";

interface GroupedRateData {
  date: string;
  label: string;
  rate: number;
  reading_count: number;
  dataPoints: number;
}

function getGroupingMode(startDate: Date, endDate: Date): GroupingMode {
  const days = differenceInDays(endDate, startDate);
  if (days <= 90) return "daily";
  if (days <= 365) return "weekly";
  return "monthly";
}

function groupDataByPeriod(
  data: RateData[],
  mode: GroupingMode
): GroupedRateData[] {
  if (mode === "daily") {
    return data.map((d) => ({
      date: d.date,
      label: format(parseISO(d.date), "MMM d"),
      rate: d.rate,
      reading_count: d.reading_count,
      dataPoints: 1,
    }));
  }

  const groups = new Map<string, RateData[]>();

  data.forEach((item) => {
    const date = parseISO(item.date);
    const key =
      mode === "weekly"
        ? format(startOfWeek(date, { weekStartsOn: 0 }), "yyyy-MM-dd")
        : format(startOfMonth(date), "yyyy-MM");

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(item);
  });

  return Array.from(groups.entries())
    .map(([key, items]) => {
      const totalRate = items.reduce((sum, d) => sum + d.rate, 0);
      const totalReadings = items.reduce((sum, d) => sum + d.reading_count, 0);

      return {
        date: key,
        label:
          mode === "weekly"
            ? format(parseISO(key), "MMM d")
            : format(parseISO(`${key}-01`), "MMM yyyy"),
        rate: totalRate / items.length,
        reading_count: totalReadings,
        dataPoints: items.length,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}
