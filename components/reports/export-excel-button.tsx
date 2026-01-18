"use client";

import { Download } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import type { ReportDayData } from "@/lib/actions/reports";

interface ExportExcelButtonProps {
  days: ReportDayData[];
  month: string;
  carryTotal: number | null;
}

export function ExportExcelButton({ days, month, carryTotal }: ExportExcelButtonProps) {
  const handleExport = () => {
    // Prepare data for Excel with Carry Total row first
    const carryTotalRow = {
      Date: "Carry Total",
      "Meter Reading (gal)": carryTotal ?? "",
      "Daily Usage (gal)": "",
      "Chlorine Level (mg/L)": "",
    };

    const dayRows = days.map((day) => ({
      Date: day.date,
      "Meter Reading (gal)": day.meterAverage ?? "",
      "Daily Usage (gal)": day.dailyUsage ?? "",
      "Chlorine Level (mg/L)": day.chlorineAverage ?? "",
    }));

    const rows = [carryTotalRow, ...dayRows];

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Monthly Report");

    // Set column widths
    ws["!cols"] = [
      { wch: 12 }, // Date
      { wch: 18 }, // Meter Reading
      { wch: 16 }, // Daily Usage
      { wch: 20 }, // Chlorine Level
    ];

    // Download file
    const fileName = `report-${month}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <Button onClick={handleExport} variant="outline">
      <Download className="mr-2 h-4 w-4" />
      Export Excel
    </Button>
  );
}
