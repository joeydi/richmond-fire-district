import { isEditorOrAdmin } from "@/lib/auth/roles";
import { getReservoirReadingsHistory } from "@/lib/actions/readings";
import { ReservoirReadingsTable } from "@/components/readings/readings-history-table";
import { HistoryPage } from "@/components/readings/history-page";

const PAGE_SIZE = 100;

interface ReservoirReadingsPageProps {
  searchParams: Promise<{
    page?: string;
    reading?: string;
  }>;
}

export default async function ReservoirReadingsPage({ searchParams }: ReservoirReadingsPageProps) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);

  const [{ data: readings, count }, canEdit] = await Promise.all([
    getReservoirReadingsHistory({
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    isEditorOrAdmin(),
  ]);

  return (
    <HistoryPage
      title="Reservoir readings"
      basePath="/dashboard/readings/reservoir"
      page={page}
      pageSize={PAGE_SIZE}
      count={count}
    >
      <ReservoirReadingsTable
        // Remount per page so the selection resets with the rows
        key={page}
        readings={readings}
        canEdit={canEdit}
        initialSelected={params.reading ?? null}
      />
    </HistoryPage>
  );
}
