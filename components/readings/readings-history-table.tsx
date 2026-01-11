"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  MeterReadingRow,
  ChlorineReadingRow,
  ReservoirReadingRow,
} from "@/lib/actions/readings";

interface ReadingsHistoryTableProps {
  meterReadings: MeterReadingRow[];
  meterCount: number;
  chlorineReadings: ChlorineReadingRow[];
  chlorineCount: number;
  reservoirReadings: ReservoirReadingRow[];
  reservoirCount: number;
  currentPage: number;
  pageSize: number;
}

export function ReadingsHistoryTable({
  meterReadings,
  meterCount,
  chlorineReadings,
  chlorineCount,
  reservoirReadings,
  reservoirCount,
  currentPage,
  pageSize,
}: ReadingsHistoryTableProps) {
  const [activeTab, setActiveTab] = useState("meter");
  const router = useRouter();

  const getCount = () => {
    switch (activeTab) {
      case "meter":
        return meterCount;
      case "chlorine":
        return chlorineCount;
      case "reservoir":
        return reservoirCount;
      default:
        return 0;
    }
  };

  const totalPages = Math.ceil(getCount() / pageSize);

  const handlePageChange = (newPage: number) => {
    router.push(`/dashboard/readings?page=${newPage}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium">Readings History</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="mb-4">
            <TabsTrigger value="meter">Meter</TabsTrigger>
            <TabsTrigger value="chlorine">Chlorine</TabsTrigger>
            <TabsTrigger value="reservoir">Reservoir</TabsTrigger>
          </TabsList>

          <TabsContent value="meter">
            <MeterReadingsTable readings={meterReadings} />
          </TabsContent>

          <TabsContent value="chlorine">
            <ChlorineReadingsTable readings={chlorineReadings} />
          </TabsContent>

          <TabsContent value="reservoir">
            <ReservoirReadingsTable readings={reservoirReadings} />
          </TabsContent>
        </Tabs>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between border-t pt-4">
            <p className="text-sm text-slate-600">
              Showing {(currentPage - 1) * pageSize + 1} to{" "}
              {Math.min(currentPage * pageSize, getCount())} of {getCount()}{" "}
              readings
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MeterReadingsTable({ readings }: { readings: MeterReadingRow[] }) {
  if (readings.length === 0) {
    return (
      <p className="text-center text-sm text-slate-500 py-8">
        No meter readings recorded yet
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Meter</TableHead>
          <TableHead className="text-right">Reading (gal)</TableHead>
          <TableHead>Notes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {readings.map((reading) => (
          <TableRow key={reading.id}>
            <TableCell>
              {format(new Date(reading.recorded_at), "MMM d, yyyy h:mm a")}
            </TableCell>
            <TableCell>{reading.meter_name ?? "—"}</TableCell>
            <TableCell className="text-right">
              {reading.reading_value.toLocaleString()}
            </TableCell>
            <TableCell className="max-w-[200px] truncate">
              {reading.notes ?? "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ChlorineReadingsTable({
  readings,
}: {
  readings: ChlorineReadingRow[];
}) {
  if (readings.length === 0) {
    return (
      <p className="text-center text-sm text-slate-500 py-8">
        No chlorine readings recorded yet
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Location</TableHead>
          <TableHead className="text-right">Level (mg/L)</TableHead>
          <TableHead>Notes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {readings.map((reading) => (
          <TableRow key={reading.id}>
            <TableCell>
              {format(new Date(reading.recorded_at), "MMM d, yyyy h:mm a")}
            </TableCell>
            <TableCell>{reading.location_name ?? "—"}</TableCell>
            <TableCell className="text-right">
              {reading.residual_level.toFixed(2)}
            </TableCell>
            <TableCell className="max-w-[200px] truncate">
              {reading.notes ?? "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ReservoirReadingsTable({
  readings,
}: {
  readings: ReservoirReadingRow[];
}) {
  if (readings.length === 0) {
    return (
      <p className="text-center text-sm text-slate-500 py-8">
        No reservoir readings recorded yet
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Reservoir</TableHead>
          <TableHead className="text-right">Level (in)</TableHead>
          <TableHead className="text-right">Percent</TableHead>
          <TableHead>Notes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {readings.map((reading) => (
          <TableRow key={reading.id}>
            <TableCell>
              {format(new Date(reading.recorded_at), "MMM d, yyyy h:mm a")}
            </TableCell>
            <TableCell>{reading.reservoir_name ?? "—"}</TableCell>
            <TableCell className="text-right">
              {reading.level_inches.toLocaleString()}
            </TableCell>
            <TableCell className="text-right">
              {reading.level_percent != null
                ? `${reading.level_percent.toFixed(1)}%`
                : "—"}
            </TableCell>
            <TableCell className="max-w-[200px] truncate">
              {reading.notes ?? "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
