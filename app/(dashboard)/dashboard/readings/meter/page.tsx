import { getMeterReadingsHistory } from "@/lib/actions/readings";
import { MeterReadingsTable } from "@/components/readings/readings-history-table";
import { HistoryPage } from "@/components/readings/history-page";

const PAGE_SIZE = 100;

interface MeterReadingsPageProps {
  searchParams: Promise<{
    page?: string;
  }>;
}

export default async function MeterReadingsPage({ searchParams }: MeterReadingsPageProps) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);

  const { data: readings, count } = await getMeterReadingsHistory({
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  return (
    <HistoryPage
      title="Meter readings"
      basePath="/dashboard/readings/meter"
      page={page}
      pageSize={PAGE_SIZE}
      count={count}
    >
      <MeterReadingsTable readings={readings} />
    </HistoryPage>
  );
}
