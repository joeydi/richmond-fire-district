"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronUp,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Search,
  Pencil,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  InfrastructurePoint,
  InfrastructureStatus,
  InfrastructureType,
} from "@/lib/types/infrastructure";
import {
  INFRASTRUCTURE_COLORS,
  INFRASTRUCTURE_LABELS,
  INFRASTRUCTURE_STATUS_COLORS,
  INFRASTRUCTURE_STATUS_LABELS,
} from "@/lib/types/infrastructure";

export type UpdateUrl = (params: Record<string, string | number>) => void;

interface InfrastructureTableProps {
  points: InfrastructurePoint[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  search: string;
  typeFilter: string;
  statusFilter: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
  isAdmin: boolean;
  isPending: boolean;
  selectedId: string | null;
  updateUrl: UpdateUrl;
  onSelect: (point: InfrastructurePoint) => void;
  onEdit: (point: InfrastructurePoint) => void;
  onCreate: () => void;
}

const typeOptions: Array<{ value: InfrastructureType | "all"; label: string }> = [
  { value: "all", label: "All types" },
  { value: "shutoff_valve", label: "Shutoff valve" },
  { value: "hydrant", label: "Hydrant" },
  { value: "well", label: "Well" },
  { value: "meter", label: "Meter" },
  { value: "reservoir", label: "Reservoir" },
  { value: "other", label: "Other" },
];

const statusOptions: Array<{ value: InfrastructureStatus | "all"; label: string }> = [
  { value: "all", label: "Any status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "maintenance", label: "Maintenance" },
  { value: "unknown", label: "Unknown" },
];

function SortHeader({
  column,
  children,
  className,
  sortBy,
  sortOrder,
  onSort,
}: {
  column: string;
  children: React.ReactNode;
  className?: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSort: (column: string) => void;
}) {
  const isSorted = sortBy === column;
  return (
    <th
      aria-sort={isSorted ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}
      className={cn("border-b px-2 py-1.5 font-medium", className)}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className="inline-flex items-center gap-0.5 uppercase hover:text-foreground"
      >
        {children}
        {isSorted &&
          (sortOrder === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />)}
      </button>
    </th>
  );
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

export function InfrastructureTable({
  points,
  totalCount,
  currentPage,
  pageSize,
  search: initialSearch,
  typeFilter,
  statusFilter,
  sortBy,
  sortOrder,
  isAdmin,
  isPending,
  selectedId,
  updateUrl,
  onSelect,
  onEdit,
  onCreate,
}: InfrastructureTableProps) {
  const [search, setSearch] = useState(initialSearch);
  const searchRef = useRef<HTMLInputElement>(null);

  const totalPages = Math.ceil(totalCount / pageSize);
  const hasFilters = Boolean(initialSearch) || typeFilter !== "all" || statusFilter !== "all";

  // "/" focuses search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !isTypingTarget(e.target)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateUrl({ search, page: 1 });
  };

  const handleSort = (column: string) => {
    const newOrder = sortBy === column && sortOrder === "asc" ? "desc" : "asc";
    updateUrl({ sortBy: column, sortOrder: newOrder, page: 1 });
  };

  const sortProps = { sortBy, sortOrder, onSort: handleSort };

  return (
    <div className="flex min-h-full flex-col">
      {/* Toolbar */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b bg-background px-4 py-2">
        <form onSubmit={handleSearch} className="flex w-full sm:w-64">
          <label className="flex h-7 flex-1 items-center gap-2 rounded-md border px-2 focus-within:border-ring">
            <Search className="size-3.5 text-muted-foreground" />
            <span className="sr-only">Search name or notes</span>
            <input
              ref={searchRef}
              type="search"
              placeholder="Search name or notes"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
            />
            <kbd className="hidden sm:inline-flex">/</kbd>
          </label>
        </form>

        <Select value={typeFilter} onValueChange={(value) => updateUrl({ type: value === "all" ? "" : value, page: 1 })}>
          <SelectTrigger size="sm" className="!h-7 px-2 text-xs" aria-label="Type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {typeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(value) => updateUrl({ status: value === "all" ? "" : value, page: 1 })}
        >
          <SelectTrigger size="sm" className="!h-7 px-2 text-xs" aria-label="Status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <span
          className={cn(
            "font-mono text-[11px] text-muted-foreground transition-opacity",
            isPending && "opacity-50"
          )}
        >
          {totalCount} {totalCount === 1 ? "POINT" : "POINTS"}
        </span>

        <div className="flex gap-0.5 rounded-md bg-muted p-0.5 font-mono text-[11px]">
          <span className="flex h-6 items-center rounded-sm bg-background px-2 font-medium shadow-[0_0_0_1px_var(--border)]">
            TABLE
          </span>
          <Link
            href="/dashboard/map"
            className="flex h-6 items-center rounded-sm px-2 text-muted-foreground hover:text-foreground"
          >
            MAP
          </Link>
        </div>

        <Button variant="outline" size="sm" className="h-7 px-2 font-mono text-[11px]" asChild>
          <Link href="/dashboard/infrastructure/report">REPORT PDF</Link>
        </Button>

        {isAdmin && (
          <Button size="sm" className="h-7 px-2.5 text-xs" onClick={onCreate}>
            <Plus className="size-3.5" />
            Point
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="relative flex-1 overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-zinc-50 text-left font-mono text-[10px] tracking-[0.06em] text-muted-foreground uppercase">
              <th className="w-10 border-b py-1.5 pl-4 font-medium">#</th>
              <SortHeader column="name" {...sortProps}>Name</SortHeader>
              <SortHeader column="type" {...sortProps}>Type</SortHeader>
              <SortHeader column="status" {...sortProps}>Status</SortHeader>
              <SortHeader column="latitude" className="text-right" {...sortProps}>
                Lat
              </SortHeader>
              <SortHeader column="longitude" className="text-right" {...sortProps}>
                Lon
              </SortHeader>
              <th className="w-16 border-b pr-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {points.length === 0 ? (
              <tr>
                <td colSpan={7} className="h-24 text-center text-muted-foreground">
                  {hasFilters
                    ? "No points match these filters."
                    : "No infrastructure points yet. Add points using the map."}
                </td>
              </tr>
            ) : (
              points.map((point, i) => {
                const isSelected = point.id === selectedId;
                return (
                  <tr
                    key={point.id}
                    data-point-id={point.id}
                    aria-selected={isSelected}
                    onClick={() => onSelect(point)}
                    className={cn(
                      "group h-8 cursor-pointer border-b border-zinc-100 transition-colors",
                      isSelected ? "bg-brand/10" : "hover:bg-zinc-50"
                    )}
                  >
                    <td className="pl-4 font-mono text-[11px] text-muted-foreground">
                      {String((currentPage - 1) * pageSize + i + 1).padStart(2, "0")}
                    </td>
                    <td className="px-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelect(point);
                        }}
                        className={cn("text-left outline-none focus-visible:underline", isSelected && "font-medium")}
                      >
                        {point.name}
                      </button>
                    </td>
                    <td className="px-2 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-zinc-700 uppercase">
                        <span
                          className="size-[7px] rounded-[2px]"
                          style={{ backgroundColor: INFRASTRUCTURE_COLORS[point.type] }}
                        />
                        {INFRASTRUCTURE_LABELS[point.type]}
                      </span>
                    </td>
                    <td className="px-2 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-zinc-700 uppercase">
                        <span
                          className="size-1.5 rounded-full"
                          style={{ backgroundColor: INFRASTRUCTURE_STATUS_COLORS[point.status] }}
                        />
                        {INFRASTRUCTURE_STATUS_LABELS[point.status]}
                      </span>
                    </td>
                    <td className="px-2 text-right font-mono">{point.latitude.toFixed(6)}</td>
                    <td className="px-2 text-right font-mono">{point.longitude.toFixed(6)}</td>
                    <td className="pr-3">
                      <div className="flex justify-end gap-0.5">
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6 text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(point);
                            }}
                            title="Edit point"
                          >
                            <Pencil className="size-3" />
                            <span className="sr-only">Edit {point.name}</span>
                          </Button>
                        )}
                        <ChevronRight
                          aria-hidden="true"
                          className={cn(
                            "size-3.5 self-center text-muted-foreground",
                            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                          )}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 flex h-10 shrink-0 items-center gap-3 border-t bg-background px-4 font-mono text-[11px] text-muted-foreground">
        <span className="flex-1">
          {totalCount === 0
            ? "0 POINTS"
            : `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, totalCount)} OF ${totalCount}`}
        </span>
        <span className="hidden lg:inline">↑↓ SELECT · ESC CLOSE{isAdmin && " · E EDIT"}</span>
        {totalPages > 1 && (
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-7"
              onClick={() => updateUrl({ page: currentPage - 1, point: "" })}
              disabled={currentPage <= 1 || isPending}
            >
              <ChevronLeft className="size-4" />
              <span className="sr-only">Previous page</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-7"
              onClick={() => updateUrl({ page: currentPage + 1, point: "" })}
              disabled={currentPage >= totalPages || isPending}
            >
              <ChevronRight className="size-4" />
              <span className="sr-only">Next page</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
