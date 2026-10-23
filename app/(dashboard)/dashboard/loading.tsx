import { Skeleton } from "@/components/ui/skeleton";

// Shown inside the dashboard shell while a page's server data loads on navigation
export default function DashboardLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-[320px]" />
    </div>
  );
}
