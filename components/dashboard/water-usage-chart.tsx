"use client";

import { useState } from "react";
import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  startOfWeek,
  startOfMonth,
  format,
  differenceInDays,
  parseISO,
} from "date-fns";

interface UsageData {
  date: string;
  total_usage: number;
  reading_count: number;
}

interface WaterUsageChartProps {
  data: UsageData[];
  title?: string;
}

type DateRange = "7d" | "30d" | "90d" | "year" | "custom";

export function WaterUsageChart({
  data,
  title = "Water Usage",
}: WaterUsageChartProps) {
  const [range, setRange] = useState<DateRange>("30d");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");

  const { filteredData, dateRange } = filterDataByRange(
    data,
    range,
    customStart,
    customEnd
  );

  // Calculate daily usage rate (difference between consecutive readings)
  const rateData = calculateDailyRate(filteredData);

  // Determine grouping mode based on date range
  const groupingMode = getGroupingMode(dateRange.start, dateRange.end);

  // Group data by period (daily, weekly, or monthly)
  const groupedData = groupDataByPeriod(rateData, groupingMode);

  // Calculate linear regression trendline
  const trendlineData = calculateTrendline(groupedData);

  const option = {
    responsive: true,
    maintainAspectRatio: true,
    legend: {
      show: true,
      data: ["Water Usage", "Trend"],
      top: 0,
      right: 0,
    },
    grid: {
      left: "0px",
      right: "0px",
      top: "50px",
      bottom: "20px",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: groupedData.map((d) => d.label),
      axisLine: { lineStyle: { color: "#e2e8f0" } },
      axisLabel: {
        color: "#94a3b8",
        fontSize: 12,
        rotate: groupingMode === "daily" && groupedData.length > 14 ? 45 : 0,
      },
      splitLine: { lineStyle: { color: "#f1f5f9" } },
    },
    yAxis: {
      type: "value",
      axisLine: { lineStyle: { color: "#e2e8f0" } },
      axisLabel: { color: "#94a3b8", fontSize: 12 },
      splitLine: { lineStyle: { color: "#f1f5f9" } },
      name: groupingMode === "daily" ? "Gallons/Day" : "Avg Gallons/Day",
      nameTextStyle: { color: "#64748b" },
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      borderColor: "#e2e8f0",
      textStyle: { color: "#1e293b" },
      formatter: (params: any) => {
        if (!params || !Array.isArray(params) || params.length === 0) {
          return "";
        }

        const barData = params.find((p: any) => p.seriesName === "Water Usage");
        const trendData = params.find((p: any) => p.seriesName === "Trend");

        if (!barData) return "";

        const dataItem = groupedData[barData.dataIndex];
        const usage = Math.round(barData.value).toLocaleString();
        const trend = trendData
          ? Math.round(trendData.value).toLocaleString()
          : null;

        let html = `<div class="text-sm">
          <p class="font-medium">${dataItem.label}</p>
          <p class="text-blue-600 font-bold">${usage} gal/day${groupingMode !== "daily" ? " avg" : ""}</p>`;

        if (groupingMode !== "daily") {
          html += `<p class="text-slate-500 text-xs">${dataItem.dataPoints} days aggregated</p>`;
        }
        html += `<p class="text-slate-500 text-xs">${dataItem.reading_count} readings</p>`;

        if (trend) {
          html += `<p class="text-orange-500 text-xs">Trend: ${trend} gal/day</p>`;
        }

        html += `</div>`;
        return html;
      },
    },
    series: [
      {
        type: "bar",
        name: "Water Usage",
        data: groupedData.map((d) => d.rate),
        itemStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "#3b82f6" },
              { offset: 1, color: "#60a5fa" },
            ],
          },
          borderRadius: [4, 4, 0, 0],
        },
        emphasis: {
          itemStyle: {
            color: "#2563eb",
          },
        },
        barMaxWidth: 40,
      },
      {
        type: "line",
        name: "Trend",
        data: trendlineData,
        smooth: false,
        lineStyle: {
          color: "#f97316",
          width: 2,
          type: "dashed",
        },
        symbol: "none",
        z: 10,
      },
    ],
  };

  const handleRangeChange = (value: string) => {
    setRange(value as DateRange);
    if (value !== "custom") {
      setCustomStart("");
      setCustomEnd("");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 gap-4 flex-wrap">
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={range} onValueChange={handleRangeChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="year">This year</SelectItem>
              <SelectItem value="custom">Custom range</SelectItem>
            </SelectContent>
          </Select>

          {range === "custom" && (
            <>
              <div className="flex items-center gap-1">
                <Label htmlFor="from-date" className="text-sm text-slate-500">
                  From:
                </Label>
                <Input
                  id="from-date"
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-36"
                />
              </div>
              <div className="flex items-center gap-1">
                <Label htmlFor="to-date" className="text-sm text-slate-500">
                  To:
                </Label>
                <Input
                  id="to-date"
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-36"
                />
              </div>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {filteredData.length === 0 ? (
          <div className="flex h-[400px] items-center justify-center text-slate-500">
            No data available for this period
          </div>
        ) : (
          <div className="h-[400px]">
            <ReactECharts
              option={option}
              style={{ height: "100%", width: "100%" }}
              opts={{ renderer: "svg" }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface FilterResult {
  filteredData: UsageData[];
  dateRange: { start: Date; end: Date };
}

function filterDataByRange(
  data: UsageData[],
  range: DateRange,
  customStart?: string,
  customEnd?: string
): FilterResult {
  const now = new Date();
  let cutoffStart: Date;
  let cutoffEnd: Date = now;

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

  const filteredData = data.filter((d) => {
    const date = new Date(d.date);
    return date >= cutoffStart && date <= cutoffEnd;
  });

  return {
    filteredData,
    dateRange: { start: cutoffStart, end: cutoffEnd },
  };
}

interface RateData {
  date: string;
  rate: number;
  reading_count: number;
}

function calculateDailyRate(data: UsageData[]): RateData[] {
  if (data.length === 0) return [];

  // Sort by date ascending to calculate differences correctly
  const sorted = [...data].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const rateData: RateData[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const previous = sorted[i - 1];

    // Calculate the difference in usage between consecutive days
    const usageDiff = current.total_usage - previous.total_usage;

    // Calculate days between readings (usually 1, but could be more if data is sparse)
    const daysDiff = Math.max(
      1,
      (new Date(current.date).getTime() - new Date(previous.date).getTime()) /
        (24 * 60 * 60 * 1000)
    );

    // Rate = usage difference / days (gallons per day)
    const rate = usageDiff / daysDiff;

    rateData.push({
      date: current.date,
      rate: Math.max(0, rate), // Avoid negative rates from meter resets
      reading_count: current.reading_count,
    });
  }

  return rateData;
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

function calculateTrendline(data: GroupedRateData[]): number[] {
  const n = data.length;
  if (n < 2) {
    return data.map((d) => d.rate);
  }

  // Use index as x value (0, 1, 2, ...) for simplicity
  const xValues = data.map((_, i) => i);
  const yValues = data.map((d) => d.rate);

  // Calculate means
  const xMean = xValues.reduce((a, b) => a + b, 0) / n;
  const yMean = yValues.reduce((a, b) => a + b, 0) / n;

  // Calculate slope and intercept using least squares
  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    const xDiff = xValues[i] - xMean;
    const yDiff = yValues[i] - yMean;
    numerator += xDiff * yDiff;
    denominator += xDiff * xDiff;
  }

  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;

  // Generate trendline values
  return xValues.map((x) => Math.max(0, slope * x + intercept));
}
