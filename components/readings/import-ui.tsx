import { cn } from "@/lib/utils";

// Shared by the import steps; matches the readings history tables
export const thClass =
  "sticky top-0 z-10 bg-zinc-50 px-2 py-1.5 text-left font-mono text-[10px] font-medium tracking-[0.06em] whitespace-nowrap text-muted-foreground uppercase shadow-[inset_0_-1px_0_var(--border)] first:pl-4 last:pr-4";
export const tdClass = "px-2 py-[7px] whitespace-nowrap first:pl-4 last:pr-4";

export const labelClass = "font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase";

/** Scrolling table inside a step, capped so long files don't push the footer away */
export function StepTable({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("max-h-72 overflow-auto rounded-md border", className)}>
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  );
}

/** Action bar at the bottom of each step: hint on the left, buttons on the right */
export function StepFooter({ hint, children }: { hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t px-4 py-3">
      {/* The hint repeats what the step shows, so phones skip it */}
      <div className="hidden min-w-0 flex-1 font-mono text-[11px] text-muted-foreground sm:block">{hint}</div>
      <div className="ml-auto flex gap-2">{children}</div>
    </div>
  );
}

/** Row of headline counts, divided like the dashboard KPI band */
export function StatStrip({
  stats,
}: {
  stats: { label: string; value: number; tone?: "good" | "warning" | "critical" }[];
}) {
  return (
    <dl
      className="grid divide-x rounded-md border"
      style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}
    >
      {stats.map((stat) => (
        <div key={stat.label} className="flex flex-col gap-1 px-3 py-2.5">
          <dt className={labelClass}>{stat.label}</dt>
          <dd
            className={cn(
              "font-mono text-[22px] leading-none font-medium tracking-tight",
              stat.value === 0
                ? "text-muted-foreground"
                : stat.tone === "good"
                  ? "text-emerald-700"
                  : stat.tone === "warning"
                    ? "text-amber-700"
                    : stat.tone === "critical"
                      ? "text-red-600"
                      : "text-foreground"
            )}
          >
            {stat.value.toLocaleString()}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Row-numbered problems from validation or import */
export function RowErrors({ title, errors }: { title: string; errors: { row: number; message: string }[] }) {
  if (errors.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <h3 className={cn(labelClass, "text-red-600")}>
        {title} · {errors.length}
      </h3>
      <StepTable className="max-h-48">
        <thead>
          <tr>
            <th className={cn(thClass, "w-16")}>Row</th>
            <th className={thClass}>Problem</th>
          </tr>
        </thead>
        <tbody>
          {errors.map((error, i) => (
            <tr key={i} className="border-b last:border-0">
              <td className={cn(tdClass, "font-mono text-muted-foreground")}>{error.row || "—"}</td>
              <td className={cn(tdClass, "whitespace-normal text-zinc-700")}>{error.message}</td>
            </tr>
          ))}
        </tbody>
      </StepTable>
    </section>
  );
}
