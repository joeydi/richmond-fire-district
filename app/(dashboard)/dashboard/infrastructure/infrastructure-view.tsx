"use client";

import { useState } from "react";
import { InfrastructureTable } from "@/components/infrastructure/infrastructure-table";
import { DeleteDialog } from "@/components/infrastructure/delete-dialog";
import type { InfrastructurePoint } from "@/lib/types/infrastructure";

interface InfrastructureViewProps {
  points: InfrastructurePoint[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  search: string;
  typeFilter: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
  isAdmin: boolean;
}

export function InfrastructureView({
  points,
  totalCount,
  currentPage,
  pageSize,
  search,
  typeFilter,
  sortBy,
  sortOrder,
  isAdmin,
}: InfrastructureViewProps) {
  const [pointToDelete, setPointToDelete] = useState<InfrastructurePoint | null>(
    null
  );

  return (
    <>
      <InfrastructureTable
        points={points}
        totalCount={totalCount}
        currentPage={currentPage}
        pageSize={pageSize}
        search={search}
        typeFilter={typeFilter}
        sortBy={sortBy}
        sortOrder={sortOrder}
        isAdmin={isAdmin}
        onDelete={setPointToDelete}
      />
      <DeleteDialog
        point={pointToDelete}
        open={!!pointToDelete}
        onOpenChange={(open) => {
          if (!open) setPointToDelete(null);
        }}
      />
    </>
  );
}
