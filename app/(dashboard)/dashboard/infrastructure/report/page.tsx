import Link from "next/link";
import { StickyNote } from "lucide-react";
import { getInfrastructureReportData } from "@/lib/actions/infrastructure-report";
import { INFRASTRUCTURE_COLORS } from "@/lib/types/infrastructure";
import { getLogDateParts } from "@/components/log/log-dates";
import { DownloadInfrastructurePdfButton } from "@/components/reports/download-infrastructure-pdf-button";
import { cn } from "@/lib/utils";

function Stat({ label, value, note }: { label: string; value: React.ReactNode; note?: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 basis-[150px] flex-col gap-0.5 border-r border-b px-4 py-2.5 last:border-r-0">
      <span className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">{label}</span>
      <span className="font-mono text-lg leading-tight font-medium tracking-tight">{value}</span>
      {note && <span className="font-mono text-[11px] text-zinc-600 uppercase">{note}</span>}
    </div>
  );
}

export default async function InfrastructureReportPage() {
  const data = await getInfrastructureReportData();
  const points = data.groups.flatMap((group) => group.points);
  const withoutPhotos = points.filter((point) => point.images.length === 0).length;
  const withNotes = points.filter((point) => point.notes?.trim()).length;
  const columns = withNotes > 0 ? 6 : 5;
  const generated = getLogDateParts(data.generatedAt);

  return (
    <div data-flush className="flex min-h-full flex-col">
      <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b bg-background px-4 py-2">
        <span className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
          PDF contents · cover, overview map, one card per point
        </span>

        <div className="flex-1" />

        <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">
          DATA AS OF {generated.date} {generated.time}
        </span>
        <DownloadInfrastructurePdfButton data={data} />
      </div>

      <section aria-label="Report summary" className="flex flex-wrap">
        <Stat
          label="Points"
          value={data.totalPoints}
          note={`Active only · ${data.groups.length} ${data.groups.length === 1 ? "type" : "types"}`}
        />
        <Stat
          label="Photos"
          value={data.totalImages}
          note={
            data.totalPoints === 0
              ? undefined
              : withoutPhotos === 0
                ? "Every point has one"
                : `${withoutPhotos} ${withoutPhotos === 1 ? "point" : "points"} without`
          }
        />
        <Stat
          label="Notes"
          value={withNotes}
          note={data.totalPoints > 0 ? `of ${data.totalPoints} points` : undefined}
        />
      </section>

      {data.totalPoints === 0 ? (
        <p className="px-4 py-10 text-center text-xs text-muted-foreground">
          No active infrastructure points to report. Add points on the{" "}
          <Link href="/dashboard/map" className="underline">
            system map
          </Link>{" "}
          or mark existing ones as active.
        </p>
      ) : (
        <div className="relative overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-50 text-left font-mono text-[10px] tracking-[0.06em] text-muted-foreground uppercase">
                <th className="w-10 border-b py-1.5 pl-4 font-medium">#</th>
                <th className="border-b px-2 font-medium">Name</th>
                <th className="hidden border-b px-2 text-right font-medium sm:table-cell">Lat</th>
                <th className="hidden border-b px-2 text-right font-medium sm:table-cell">Lon</th>
                <th className={cn("w-16 border-b px-2 text-right font-medium", withNotes === 0 && "pr-4")}>Photos</th>
                {withNotes > 0 && <th className="hidden border-b px-2 pr-4 font-medium md:table-cell">Notes</th>}
              </tr>
            </thead>
            {data.groups.map((group) => {
              const photoCount = group.points.reduce((sum, point) => sum + point.images.length, 0);
              return (
                <tbody key={group.type}>
                  <tr className="h-8 border-b bg-zinc-50/60">
                    <td colSpan={columns} className="px-4">
                      <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase">
                        <span
                          className="size-[7px] rounded-[2px]"
                          style={{ backgroundColor: INFRASTRUCTURE_COLORS[group.type] }}
                        />
                        <span className="font-medium text-foreground">{group.label}</span>
                        <span className="text-muted-foreground">
                          {group.points.length} {group.points.length === 1 ? "point" : "points"} · {photoCount}{" "}
                          {photoCount === 1 ? "photo" : "photos"}
                        </span>
                      </span>
                    </td>
                  </tr>
                  {group.points.map((point, i) => (
                    <tr key={point.id} className="h-8 border-b border-zinc-100 hover:bg-zinc-50">
                      <td className="pl-4 font-mono text-[11px] text-muted-foreground">
                        {String(i + 1).padStart(2, "0")}
                      </td>
                      <td className="px-2 whitespace-nowrap">
                        <Link
                          href={`/dashboard/infrastructure?point=${point.id}`}
                          className="underline-offset-2 hover:underline"
                        >
                          {point.name}
                        </Link>
                      </td>
                      <td className="hidden px-2 text-right font-mono sm:table-cell">{point.latitude.toFixed(6)}</td>
                      <td className="hidden px-2 text-right font-mono sm:table-cell">{point.longitude.toFixed(6)}</td>
                      <td
                        className={cn(
                          "px-2 text-right font-mono",
                          withNotes === 0 && "pr-4",
                          point.images.length === 0 && "text-muted-foreground",
                        )}
                      >
                        {point.images.length === 0 ? "—" : point.images.length}
                      </td>
                      {withNotes > 0 && (
                        <td className="hidden max-w-0 px-2 pr-4 md:table-cell">
                          {point.notes?.trim() ? (
                            <span className="flex items-center gap-1.5 text-zinc-600">
                              <StickyNote className="size-3 shrink-0 text-muted-foreground" />
                              <span className="truncate">{point.notes}</span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              );
            })}
          </table>
        </div>
      )}
    </div>
  );
}
