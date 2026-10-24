import {
  getInfrastructurePointDetails,
  getInfrastructurePoints,
} from "@/lib/actions/infrastructure";
import { isAdmin } from "@/lib/auth/roles";
import { InfrastructureView } from "./infrastructure-view";
import type {
  InfrastructurePoint,
  InfrastructureStatus,
  InfrastructureType,
} from "@/lib/types/infrastructure";

interface InfrastructurePageProps {
  searchParams: Promise<{
    search?: string;
    type?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: string;
    point?: string;
  }>;
}

export default async function InfrastructurePage({
  searchParams,
}: InfrastructurePageProps) {
  const params = await searchParams;
  const search = params.search || "";
  const typeFilter = params.type || "all";
  const statusFilter = params.status || "all";
  const sortBy = (params.sortBy as keyof InfrastructurePoint) || "name";
  const sortOrder = (params.sortOrder as "asc" | "desc") || "asc";
  const page = parseInt(params.page || "1", 10);
  const pageSize = 40;

  const [{ data: points, count }, userIsAdmin, details] = await Promise.all([
    getInfrastructurePoints({
      search,
      type: typeFilter as InfrastructureType | "all",
      status: statusFilter as InfrastructureStatus | "all",
      sortBy,
      sortOrder,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    isAdmin(),
    params.point ? getInfrastructurePointDetails(params.point) : null,
  ]);

  return (
    <InfrastructureView
      points={points}
      totalCount={count}
      currentPage={page}
      pageSize={pageSize}
      search={search}
      typeFilter={typeFilter}
      statusFilter={statusFilter}
      sortBy={sortBy}
      sortOrder={sortOrder}
      isAdmin={userIsAdmin}
      details={details}
    />
  );
}
