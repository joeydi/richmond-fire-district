"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  ChevronUp,
  ChevronDown,
  Search,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { InfrastructurePoint, InfrastructureType } from "@/lib/types/infrastructure";
import {
  INFRASTRUCTURE_COLORS,
  INFRASTRUCTURE_LABELS,
  INFRASTRUCTURE_STATUS_COLORS,
  INFRASTRUCTURE_STATUS_LABELS,
} from "@/lib/types/infrastructure";

interface InfrastructureTableProps {
  points: InfrastructurePoint[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  search: string;
  typeFilter: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
  isAdmin: boolean;
  onDelete?: (point: InfrastructurePoint) => void;
  onEdit?: (point: InfrastructurePoint) => void;
}

const typeOptions: Array<{ value: InfrastructureType | "all"; label: string }> = [
  { value: "all", label: "All Types" },
  { value: "shutoff_valve", label: "Shutoff Valve" },
  { value: "hydrant", label: "Hydrant" },
  { value: "well", label: "Well" },
  { value: "meter", label: "Meter" },
  { value: "reservoir", label: "Reservoir" },
  { value: "other", label: "Other" },
];

function formatCoordinate(coord: number): string {
  return coord.toFixed(6);
}

function getTypeColor(type: InfrastructureType): string {
  return INFRASTRUCTURE_COLORS[type] || "#6B7280";
}

function getStatusColor(status: string): string {
  return (
    INFRASTRUCTURE_STATUS_COLORS[
      status as keyof typeof INFRASTRUCTURE_STATUS_COLORS
    ] || "#6B7280"
  );
}

function hexToTailwind(hex: string): string {
  const colorMap: Record<string, string> = {
    "#EF4444": "bg-red-100 text-red-800",
    "#F97316": "bg-orange-100 text-orange-800",
    "#3B82F6": "bg-blue-100 text-blue-800",
    "#22C55E": "bg-green-100 text-green-800",
    "#8B5CF6": "bg-purple-100 text-purple-800",
    "#6B7280": "bg-slate-100 text-slate-800",
    "#F59E0B": "bg-amber-100 text-amber-800",
    "#9CA3AF": "bg-gray-100 text-gray-800",
  };
  return colorMap[hex] || "bg-slate-100 text-slate-800";
}

export function InfrastructureTable({
  points,
  totalCount,
  currentPage,
  pageSize,
  search: initialSearch,
  typeFilter,
  sortBy,
  sortOrder,
  isAdmin,
  onDelete,
  onEdit,
}: InfrastructureTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(initialSearch);

  const totalPages = Math.ceil(totalCount / pageSize);

  const updateUrl = (params: Record<string, string | number>) => {
    const url = new URL(window.location.href);
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, String(value));
      } else {
        url.searchParams.delete(key);
      }
    });
    startTransition(() => {
      router.push(url.pathname + url.search);
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateUrl({ search, page: 1 });
  };

  const handleTypeChange = (value: string) => {
    updateUrl({ type: value, page: 1 });
  };

  const handleSort = (column: string) => {
    const newOrder =
      sortBy === column && sortOrder === "asc" ? "desc" : "asc";
    updateUrl({ sortBy: column, sortOrder: newOrder, page: 1 });
  };

  const handlePageChange = (page: number) => {
    updateUrl({ page });
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) return null;
    return sortOrder === "asc" ? (
      <ChevronUp className="ml-1 inline h-4 w-4" />
    ) : (
      <ChevronDown className="ml-1 inline h-4 w-4" />
    );
  };

  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearch} className="flex max-w-sm flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by name or notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="outline" disabled={isPending}>
            Search
          </Button>
        </form>

        <Select value={typeFilter || "all"} onValueChange={handleTypeChange}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            {typeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer hover:bg-slate-50"
                onClick={() => handleSort("name")}
              >
                Name
                <SortIcon column="name" />
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-slate-50"
                onClick={() => handleSort("type")}
              >
                Type
                <SortIcon column="type" />
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-slate-50"
                onClick={() => handleSort("status")}
              >
                Status
                <SortIcon column="status" />
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-slate-50 text-right"
                onClick={() => handleSort("latitude")}
              >
                Latitude
                <SortIcon column="latitude" />
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-slate-50 text-right"
                onClick={() => handleSort("longitude")}
              >
                Longitude
                <SortIcon column="longitude" />
              </TableHead>
              {isAdmin && <TableHead className="w-24">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {points.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isAdmin ? 6 : 5}
                  className="h-24 text-center text-slate-500"
                >
                  {initialSearch || typeFilter !== "all"
                    ? "No infrastructure points found matching your filters."
                    : "No infrastructure points yet. Add points using the map."}
                </TableCell>
              </TableRow>
            ) : (
              points.map((point) => (
                <TableRow
                  key={point.id}
                  className="hover:bg-slate-50"
                >
                  <TableCell className="font-medium">{point.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={hexToTailwind(getTypeColor(point.type))}
                    >
                      {INFRASTRUCTURE_LABELS[point.type]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={hexToTailwind(
                        getStatusColor(point.status)
                      )}
                    >
                      {
                        INFRASTRUCTURE_STATUS_LABELS[
                          point.status as keyof typeof INFRASTRUCTURE_STATUS_LABELS
                        ]
                      }
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-slate-600 font-mono text-sm">
                    {formatCoordinate(point.latitude)}
                  </TableCell>
                  <TableCell className="text-right text-slate-600 font-mono text-sm">
                    {formatCoordinate(point.longitude)}
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit?.(point)}
                          title="Edit infrastructure point"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete?.(point)}
                          title="Delete infrastructure point"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            Showing {(currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, totalCount)} of {totalCount}{" "}
            infrastructure points
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1 || isPending}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || isPending}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
