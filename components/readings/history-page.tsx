import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HistoryPageProps {
  title: string;
  basePath: string;
  page: number;
  pageSize: number;
  count: number;
  children: React.ReactNode;
}

/**
 * Full-bleed frame for a readings history tab: title bar, table, pagination.
 * data-fill makes the readings layout fill the viewport, so the table scrolls
 * inside the frame and a docked side sheet can take its full height.
 */
export function HistoryPage({ title, basePath, page, pageSize, count, children }: HistoryPageProps) {
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const first = count === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, count);

  return (
    <div data-bleed data-fill className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-9 items-center gap-2.5 px-4">
        <h2 className="text-[13px] font-semibold">{title}</h2>
        <span className="font-mono text-[11px] text-muted-foreground">
          {count.toLocaleString()} {count === 1 ? "READING" : "READINGS"}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col border-t">{children}</div>

      <div className="flex h-10 shrink-0 items-center gap-3 border-t bg-background px-4 font-mono text-[11px] text-muted-foreground">
        <span className="flex-1">
          {first}–{last} OF {count.toLocaleString()}
        </span>
        {totalPages > 1 && (
          <div className="flex gap-1">
            <PageLink href={`${basePath}?page=${page - 1}`} disabled={page <= 1} label="Previous page">
              <ChevronLeft className="size-4" />
            </PageLink>
            <PageLink href={`${basePath}?page=${page + 1}`} disabled={page >= totalPages} label="Next page">
              <ChevronRight className="size-4" />
            </PageLink>
          </div>
        )}
      </div>
    </div>
  );
}

function PageLink({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <Button variant="outline" size="icon" className="size-7" disabled>
        {children}
        <span className="sr-only">{label}</span>
      </Button>
    );
  }
  return (
    <Button variant="outline" size="icon" className="size-7" asChild>
      <Link href={href}>
        {children}
        <span className="sr-only">{label}</span>
      </Link>
    </Button>
  );
}
