import { getInfrastructurePoints } from "@/lib/actions/infrastructure";
import { isAdmin } from "@/lib/auth/roles";
import { InfrastructureView } from "./infrastructure-view";
import type { InfrastructurePoint } from "@/lib/types/infrastructure";

interface InfrastructurePageProps {
  searchParams: Promise<{
    search?: string;
    type?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: string;
  }>;
}

export default async function InfrastructurePage({
  searchParams,
}: InfrastructurePageProps) {
  const params = await searchParams;
  const search = params.search || "";
  const typeFilter = params.type || "all";
  const sortBy = (params.sortBy as keyof InfrastructurePoint) || "name";
  const sortOrder = (params.sortOrder as "asc" | "desc") || "asc";
  const page = parseInt(params.page || "1", 10);
  const pageSize = 20;

  const [{ data: points, count }, userIsAdmin] = await Promise.all([
    getInfrastructurePoints({
      search,
      type: typeFilter as any,
      sortBy,
      sortOrder,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    isAdmin(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Infrastructure Points</h1>
        <p className="mt-1 text-sm text-slate-600">
          View and manage infrastructure points on the water system map
        </p>
      </div>
      <InfrastructureView
        points={points}
        totalCount={count}
        currentPage={page}
        pageSize={pageSize}
        search={search}
        typeFilter={typeFilter}
        sortBy={sortBy}
        sortOrder={sortOrder}
        isAdmin={userIsAdmin}
      />
    </div>
  );
}
