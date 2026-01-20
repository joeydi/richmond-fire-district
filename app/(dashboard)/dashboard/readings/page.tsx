import { Suspense } from "react";
import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Droplets, FlaskConical, Waves, Upload } from "lucide-react";
import { isEditorOrAdmin } from "@/lib/auth/roles";
import { ReadingsHistoryTable } from "@/components/readings/readings-history-table";
import {
  getMeterReadingsHistory,
  getChlorineReadingsHistory,
  getReservoirReadingsHistory,
} from "@/lib/actions/readings";

const readingTypes = [
  {
    title: "Meter Reading",
    description: "Record meter readings for water production",
    href: "/dashboard/readings/meter",
    icon: Droplets,
  },
  {
    title: "Chlorine Levels",
    description: "Record chlorine residual measurements",
    href: "/dashboard/readings/chlorine",
    icon: FlaskConical,
  },
  {
    title: "Reservoir Levels",
    description: "Record reservoir water levels",
    href: "/dashboard/readings/reservoir",
    icon: Waves,
  },
];

interface ReadingsPageProps {
  searchParams: Promise<{
    page?: string;
  }>;
}

export default async function ReadingsPage({ searchParams }: ReadingsPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const canEdit = await isEditorOrAdmin();

  return (
    <div className="space-y-6">
      {canEdit && (
        <div className="flex justify-end">
          <Button asChild variant="outline">
            <Link href="/dashboard/readings/import">
              <Upload className="mr-2 h-4 w-4" />
              Import CSV
            </Link>
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {readingTypes.map((type) => (
          <Link key={type.href} href={type.href}>
            <Card className="h-full transition-colors hover:bg-slate-50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                    <type.icon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{type.title}</CardTitle>
                    <CardDescription>{type.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <Suspense fallback={<Skeleton className="h-[400px] rounded-lg" />}>
        <ReadingsHistorySection page={page} />
      </Suspense>
    </div>
  );
}

async function ReadingsHistorySection({ page }: { page: number }) {
  const pageSize = 100;
  const offset = (page - 1) * pageSize;

  const [meterData, chlorineData, reservoirData] = await Promise.all([
    getMeterReadingsHistory({ limit: pageSize, offset }),
    getChlorineReadingsHistory({ limit: pageSize, offset }),
    getReservoirReadingsHistory({ limit: pageSize, offset }),
  ]);

  return (
    <ReadingsHistoryTable
      meterReadings={meterData.data}
      meterCount={meterData.count}
      chlorineReadings={chlorineData.data}
      chlorineCount={chlorineData.count}
      reservoirReadings={reservoirData.data}
      reservoirCount={reservoirData.count}
      currentPage={page}
      pageSize={pageSize}
    />
  );
}
