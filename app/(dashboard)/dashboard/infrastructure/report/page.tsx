import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getInfrastructureReportData } from "@/lib/actions/infrastructure-report";
import { INFRASTRUCTURE_COLORS } from "@/lib/types/infrastructure";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DownloadInfrastructurePdfButton } from "@/components/reports/download-infrastructure-pdf-button";

export default async function InfrastructureReportPage() {
  const data = await getInfrastructureReportData();

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/dashboard/infrastructure">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Infrastructure
        </Link>
      </Button>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle>Infrastructure Report</CardTitle>
            <CardDescription>
              A printable PDF of every active infrastructure point, grouped by
              type, with coordinates, notes, and photos.
            </CardDescription>
          </div>
          <DownloadInfrastructurePdfButton data={data} />
        </CardHeader>

        <CardContent>
          {data.totalPoints === 0 ? (
            <p className="text-sm text-slate-500">
              No active infrastructure points to report. Add points on the{" "}
              <Link href="/dashboard/map" className="underline">
                system map
              </Link>{" "}
              or mark existing ones as active.
            </p>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                {data.totalPoints} active{" "}
                {data.totalPoints === 1 ? "point" : "points"} across{" "}
                {data.groups.length}{" "}
                {data.groups.length === 1 ? "category" : "categories"}, with{" "}
                {data.totalImages}{" "}
                {data.totalImages === 1 ? "photo" : "photos"}.
              </p>

              <ul className="divide-y rounded-lg border">
                {data.groups.map((group) => {
                  const photoCount = group.points.reduce(
                    (sum, point) => sum + point.images.length,
                    0
                  );

                  return (
                    <li
                      key={group.type}
                      className="flex items-center gap-3 px-4 py-3 text-sm"
                    >
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{
                          backgroundColor: INFRASTRUCTURE_COLORS[group.type],
                        }}
                      />
                      <span className="font-medium">{group.label}</span>
                      <span className="ml-auto text-slate-500">
                        {group.points.length}{" "}
                        {group.points.length === 1 ? "point" : "points"}
                        {" · "}
                        {photoCount} {photoCount === 1 ? "photo" : "photos"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
