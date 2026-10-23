import { format } from "date-fns";
import { getMonthlyReportData, getReportMeters } from "@/lib/actions/reports";
import { canEdit } from "@/lib/auth/roles";
import { ReportsView } from "./reports-view";

interface ReportsPageProps {
  searchParams: Promise<{
    month?: string;
    meterId?: string;
  }>;
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const params = await searchParams;
  const month = params.month || format(new Date(), "yyyy-MM");

  // Fetch meters first to determine default meterId
  const meters = await getReportMeters();
  const meterId = params.meterId || meters[0]?.id || "";

  // If no meters exist, show empty state
  if (!meterId) {
    return (
      <p className="py-16 text-center text-xs text-muted-foreground">
        No meters configured. Add a meter to start generating reports.
      </p>
    );
  }

  const [reportData, userCanEdit] = await Promise.all([
    getMonthlyReportData({
      month,
      meterId,
    }),
    canEdit(),
  ]);

  return (
    <ReportsView
      data={reportData}
      month={month}
      meterId={meterId}
      canEdit={userCanEdit}
    />
  );
}
