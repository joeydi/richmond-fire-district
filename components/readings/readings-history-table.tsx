"use client";

import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MeterReadingRow,
  ChlorineReadingRow,
  ReservoirReadingRow,
} from "@/lib/actions/readings";

interface ReadingsHistoryTableProps {
  meterReadings: MeterReadingRow[];
  chlorineReadings: ChlorineReadingRow[];
  reservoirReadings: ReservoirReadingRow[];
}

export function ReadingsHistoryTable({
  meterReadings,
  chlorineReadings,
  reservoirReadings,
}: ReadingsHistoryTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium">Readings History</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="meter" className="w-full">
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
