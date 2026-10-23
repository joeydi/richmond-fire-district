import { getChlorineReadingsHistory } from "@/lib/actions/readings";
import { ChlorineReadingsTable } from "@/components/readings/readings-history-table";
import { HistoryPage } from "@/components/readings/history-page";

const PAGE_SIZE = 100;

interface ChlorineReadingsPageProps {
  searchParams: Promise<{
    page?: string;
  }>;
}

export default async function ChlorineReadingsPage({ searchParams }: ChlorineReadingsPageProps) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);

  const { data: readings, count } = await getChlorineReadingsHistory({
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  return (
    <HistoryPage
      title="Chlorine readings"
      basePath="/dashboard/readings/chlorine"
      page={page}
      pageSize={PAGE_SIZE}
      count={count}
    >
      <ChlorineReadingsTable readings={readings} />
    </HistoryPage>
  );
}
