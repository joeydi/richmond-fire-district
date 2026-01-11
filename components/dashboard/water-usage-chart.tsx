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

interface UsageData {
  date: string;
  total_usage: number;
  reading_count: number;
}

interface WaterUsageChartProps {
  data: UsageData[];
  title?: string;
}

type DateRange = "7d" | "30d" | "90d" | "year";

export function WaterUsageChart({
  data,
  title = "Water Usage",
}: WaterUsageChartProps) {
  const [range, setRange] = useState<DateRange>("30d");

  const filteredData = filterDataByRange(data, range);

  // ECharts requires timestamp values for datetime axis
  const timestamps = filteredData.map((d) => new Date(d.date).getTime());
  const usageValues = filteredData.map((d) => d.total_usage);
  const readingCounts = filteredData.map((d) => d.reading_count);

  const option = {
    responsive: true,
    maintainAspectRatio: true,
    grid: {
      left: "60px",
      right: "20px",
      top: "20px",
      bottom: "60px",
      containLabel: true,
    },
    xAxis: {
      type: "time",
      boundaryGap: false,
      axisLine: { lineStyle: { color: "#e2e8f0" } },
      axisLabel: { color: "#94a3b8", fontSize: 12 },
      splitLine: { lineStyle: { color: "#f1f5f9" } },
    },
    yAxis: {
      type: "value",
      axisLine: { lineStyle: { color: "#e2e8f0" } },
      axisLabel: { color: "#94a3b8", fontSize: 12 },
      splitLine: { lineStyle: { color: "#f1f5f9" } },
      name: "Gallons",
      nameTextStyle: { color: "#64748b" },
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(255, 255, 255, 0.9)",
      borderColor: "#e2e8f0",
      textStyle: { color: "#1e293b" },
      formatter: (params: any) => {
        if (!params || !Array.isArray(params) || params.length === 0) {
          return "";
        }

        const param = params[0];
        const date = new Date(param.value[0]);
        const dateStr = date.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        });
        const usage = Math.round(param.value[1]).toLocaleString();
        const readings = param.data[2];

        return `<div class="text-sm">
          <p class="font-medium">${dateStr}</p>
          <p class="text-blue-600 font-bold">${usage} gal</p>
          <p class="text-slate-500 text-xs">${readings} readings</p>
        </div>`;
      },
    },
    series: [
      {
        type: "line",
        name: "Water Usage",
        data: timestamps.map((t, i) => [t, usageValues[i], readingCounts[i]]),
        smooth: true,
        lineStyle: { color: "#3b82f6", width: 2 },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(59, 130, 246, 0.3)" },
              { offset: 1, color: "rgba(59, 130, 246, 0)" },
            ],
          },
        },
        symbol: "none",
        sampling: "lttb",
      },
    ],
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
        <Select value={range} onValueChange={(v) => setRange(v as DateRange)}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="year">This year</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {filteredData.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-slate-500">
            No data available for this period
          </div>
        ) : (
          <div className="h-[300px]">
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

function filterDataByRange(data: UsageData[], range: DateRange): UsageData[] {
  const now = new Date();
  let cutoff: Date;

  switch (range) {
    case "7d":
      cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "90d":
      cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case "year":
      cutoff = new Date(now.getFullYear(), 0, 1);
      break;
  }

  return data.filter((d) => new Date(d.date) >= cutoff);
}
