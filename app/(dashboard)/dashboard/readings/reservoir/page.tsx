import { getReservoirReadingsHistory } from "@/lib/actions/readings";
import { ReservoirReadingsTable } from "@/components/readings/readings-history-table";
import { HistoryPage } from "@/components/readings/history-page";

const PAGE_SIZE = 100;

interface ReservoirReadingsPageProps {
  searchParams: Promise<{
    page?: string;
  }>;
}

export default async function ReservoirReadingsPage({ searchParams }: ReservoirReadingsPageProps) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);

  const { data: readings, count } = await getReservoirReadingsHistory({
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  return (
    <HistoryPage
      title="Reservoir readings"
      basePath="/dashboard/readings/reservoir"
      page={page}
      pageSize={PAGE_SIZE}
      count={count}
    >
      <ReservoirReadingsTable readings={readings} />
    </HistoryPage>
  );
}
