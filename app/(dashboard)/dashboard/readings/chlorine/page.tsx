import Link from "next/link";
import { getChlorineReadingsHistory } from "@/lib/actions/readings";
import { ChlorineReadingsTable } from "@/components/readings/readings-history-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ChlorineReadingsPageProps {
  searchParams: Promise<{
    page?: string;
  }>;
}

export default async function ChlorineReadingsPage({
  searchParams,
}: ChlorineReadingsPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const pageSize = 100;
  const offset = (page - 1) * pageSize;

  const { data: readings, count } = await getChlorineReadingsHistory({
    limit: pageSize,
    offset,
  });

  const totalPages = Math.ceil(count / pageSize);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">
            Chlorine Readings History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChlorineReadingsTable readings={readings} />

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between border-t pt-4">
              <p className="text-sm text-slate-600">
                Showing {(page - 1) * pageSize + 1} to{" "}
                {Math.min(page * pageSize, count)} of {count} readings
              </p>
              <div className="flex gap-2">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                >
                  <Link
                    href={`/dashboard/readings/chlorine?page=${page - 1}`}
                    aria-disabled={page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                >
                  <Link
                    href={`/dashboard/readings/chlorine?page=${page + 1}`}
                    aria-disabled={page >= totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
