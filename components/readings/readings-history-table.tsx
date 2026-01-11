"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  deleteMeterReading,
  deleteChlorineReading,
  deleteReservoirReading,
} from "@/lib/actions/readings";
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
import { ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import {
  MeterReadingRow,
  ChlorineReadingRow,
  ReservoirReadingRow,
} from "@/lib/actions/readings";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [isPending, startTransition] = useTransition();
  const [readingToDelete, setReadingToDelete] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!readingToDelete) return;

    startTransition(async () => {
      const result = await deleteMeterReading(readingToDelete);
      if (result.success) {
        toast.success("Meter reading deleted");
      } else {
        toast.error(result.error || "Failed to delete reading");
      }
    });

    setReadingToDelete(null);
  };

  if (readings.length === 0) {
    return (
      <p className="text-center text-sm text-slate-500 py-8">
        No meter readings recorded yet
      </p>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Meter</TableHead>
            <TableHead className="text-right">Reading (gal)</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead className="text-right">Actions</TableHead>
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
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {}}
                    disabled={isPending}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setReadingToDelete(reading.id)}
                    disabled={isPending}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={readingToDelete !== null} onOpenChange={(open) => !open && setReadingToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete meter reading</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this meter reading? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ChlorineReadingsTable({
  readings,
}: {
  readings: ChlorineReadingRow[];
}) {
  const [isPending, startTransition] = useTransition();
  const [readingToDelete, setReadingToDelete] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!readingToDelete) return;

    startTransition(async () => {
      const result = await deleteChlorineReading(readingToDelete);
      if (result.success) {
        toast.success("Chlorine reading deleted");
      } else {
        toast.error(result.error || "Failed to delete reading");
      }
    });

    setReadingToDelete(null);
  };

  if (readings.length === 0) {
    return (
      <p className="text-center text-sm text-slate-500 py-8">
        No chlorine readings recorded yet
      </p>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Location</TableHead>
            <TableHead className="text-right">Level (mg/L)</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead className="text-right">Actions</TableHead>
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
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {}}
                    disabled={isPending}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setReadingToDelete(reading.id)}
                    disabled={isPending}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={readingToDelete !== null} onOpenChange={(open) => !open && setReadingToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete chlorine reading</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this chlorine reading? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ReservoirReadingsTable({
  readings,
}: {
  readings: ReservoirReadingRow[];
}) {
  const [isPending, startTransition] = useTransition();
  const [readingToDelete, setReadingToDelete] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!readingToDelete) return;

    startTransition(async () => {
      const result = await deleteReservoirReading(readingToDelete);
      if (result.success) {
        toast.success("Reservoir reading deleted");
      } else {
        toast.error(result.error || "Failed to delete reading");
      }
    });

    setReadingToDelete(null);
  };

  if (readings.length === 0) {
    return (
      <p className="text-center text-sm text-slate-500 py-8">
        No reservoir readings recorded yet
      </p>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Reservoir</TableHead>
            <TableHead className="text-right">Level (in)</TableHead>
            <TableHead className="text-right">Percent</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead className="text-right">Actions</TableHead>
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
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {}}
                    disabled={isPending}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setReadingToDelete(reading.id)}
                    disabled={isPending}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={readingToDelete !== null} onOpenChange={(open) => !open && setReadingToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete reservoir reading</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this reservoir reading? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
