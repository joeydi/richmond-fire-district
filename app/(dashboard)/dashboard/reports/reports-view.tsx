"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MonthNavigation } from "@/components/reports/month-navigation";
import { ReportsTable } from "@/components/reports/reports-table";
import { ExportExcelButton } from "@/components/reports/export-excel-button";
import type { MonthlyReportData } from "@/lib/actions/reports";

interface ReportsViewProps {
  data: MonthlyReportData;
  month: string;
  meterId: string;
  canEdit: boolean;
}

export function ReportsView({
  data,
  month,
  meterId,
  canEdit,
}: ReportsViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const updateUrl = (params: Record<string, string>) => {
    const url = new URL(window.location.href);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    startTransition(() => router.push(url.pathname + url.search));
  };

  const handleMeterChange = (value: string) => {
    updateUrl({ meterId: value });
  };

  return (
    <div className="space-y-4">
      {/* Controls row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <MonthNavigation
          currentMonth={month}
          availableMonths={data.availableMonths}
        />

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select
            value={meterId}
            onValueChange={handleMeterChange}
            disabled={isPending}
          >
            <SelectTrigger className="w-full sm:w-48">
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

          <ExportExcelButton days={data.days} month={month} carryTotal={data.carryTotal} />
        </div>
      </div>

      {/* Table */}
      <ReportsTable
        days={data.days}
        canEdit={canEdit}
        meterId={meterId}
        carryTotal={data.carryTotal}
      />
    </div>
  );
}
