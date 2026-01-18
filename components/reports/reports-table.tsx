"use client";

import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AcceptValueButton } from "./accept-value-button";
import type { ReportDayData } from "@/lib/actions/reports";

interface ReportsTableProps {
  days: ReportDayData[];
  canEdit: boolean;
  meterId: string;
}

export function ReportsTable({
  days,
  canEdit,
  meterId,
}: ReportsTableProps) {
  const hasAnyMeterData = days.some((d) => d.meterAverage !== null);
  const hasAnyChlorineData = days.some((d) => d.chlorineAverage !== null);

  if (!hasAnyMeterData && !hasAnyChlorineData) {
    return (
      <div className="rounded-lg border bg-white p-8 text-center text-slate-500">
        No readings recorded for this month. Try selecting a different month or
        adjusting your filters.
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-32">Date</TableHead>
            <TableHead className="text-right">Meter Reading (gal)</TableHead>
            <TableHead className="text-right">Chlorine Level (mg/L)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {days.map((day) => (
            <TableRow key={day.date}>
              <TableCell className="font-medium">{day.date}</TableCell>

              {/* Meter reading cell */}
              <TableCell
                className={cn(
                  "text-right",
                  day.isMeterInterpolated && day.meterAverage !== null && "bg-amber-50"
                )}
              >
                <div className="flex items-center justify-end gap-2">
                  {day.meterAverage !== null ? (
                    <>
                      <span>{day.meterAverage.toLocaleString()}</span>
                      {day.isMeterInterpolated && (
                        <>
                          <Badge
                            variant="outline"
                            className="border-amber-300 bg-amber-100 text-amber-800 text-xs"
                          >
                            Est.
                          </Badge>
                          {canEdit && (
                            <AcceptValueButton
                              type="meter"
                              date={day.date}
                              value={day.meterAverage}
                              meterId={meterId}
                            />
                          )}
                        </>
                      )}
                    </>
                  ) : (
                    <span className="text-slate-400">&mdash;</span>
                  )}
                </div>
              </TableCell>

              {/* Chlorine reading cell */}
              <TableCell
                className={cn(
                  "text-right",
                  day.isChlorineInterpolated && day.chlorineAverage !== null && "bg-amber-50"
                )}
              >
                <div className="flex items-center justify-end gap-2">
                  {day.chlorineAverage !== null ? (
                    <>
                      <span>{day.chlorineAverage.toFixed(2)}</span>
                      {day.isChlorineInterpolated && (
                        <>
                          <Badge
                            variant="outline"
                            className="border-amber-300 bg-amber-100 text-amber-800 text-xs"
                          >
                            Est.
                          </Badge>
                          {canEdit && (
                            <AcceptValueButton
                              type="chlorine"
                              date={day.date}
                              value={day.chlorineAverage}
                            />
                          )}
                        </>
                      )}
                    </>
                  ) : (
                    <span className="text-slate-400">&mdash;</span>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
