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
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="mt-1 text-sm text-slate-600">
            Monthly readings with daily breakdown and interpolation
          </p>
        </div>
        <div className="rounded-lg border bg-white p-8 text-center text-slate-500">
          No meters configured. Add a meter to start generating reports.
        </div>
      </div>
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        <p className="mt-1 text-sm text-slate-600">
          Monthly readings with daily breakdown and interpolation
        </p>
      </div>
      <ReportsView
        data={reportData}
        month={month}
        meterId={meterId}
        canEdit={userCanEdit}
      />
    </div>
  );
}
