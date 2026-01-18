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
import type { Contact, ContactType } from "@/lib/actions/contacts";

interface ContactsTableProps {
  contacts: Contact[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  search: string;
  typeFilter: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
  canEdit: boolean;
  onDelete?: (contact: Contact) => void;
}

const typeOptions: Array<{ value: ContactType | "all"; label: string }> = [
  { value: "all", label: "All Types" },
  { value: "resident", label: "Resident" },
  { value: "business", label: "Business" },
  { value: "contractor", label: "Contractor" },
  { value: "utility", label: "Utility" },
  { value: "emergency", label: "Emergency" },
  { value: "other", label: "Other" },
];

const contactTypeLabels: Record<ContactType, string> = {
  resident: "Resident",
  business: "Business",
  contractor: "Contractor",
  utility: "Utility",
  emergency: "Emergency",
  other: "Other",
};

const contactTypeBadgeColors: Record<ContactType, string> = {
  resident: "bg-blue-100 text-blue-800",
  business: "bg-purple-100 text-purple-800",
  contractor: "bg-orange-100 text-orange-800",
  utility: "bg-green-100 text-green-800",
  emergency: "bg-red-100 text-red-800",
  other: "bg-slate-100 text-slate-800",
};

export function ContactsTable({
  contacts,
  totalCount,
  currentPage,
  pageSize,
  search: initialSearch,
  typeFilter,
  sortBy,
  sortOrder,
  canEdit,
  onDelete,
}: ContactsTableProps) {
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
    updateUrl({ sortBy: column, sortOrder: newOrder });
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
              placeholder="Search contacts..."
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
      <div className="rounded-lg border bg-white">
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
                onClick={() => handleSort("contact_type")}
              >
                Type
                <SortIcon column="contact_type" />
              </TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Address</TableHead>
              {canEdit && <TableHead className="w-24">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canEdit ? 6 : 5}
                  className="h-24 text-center text-slate-500"
                >
                  {initialSearch || typeFilter !== "all"
                    ? "No contacts found matching your filters."
                    : "No contacts yet. Add your first contact to get started."}
                </TableCell>
              </TableRow>
            ) : (
              contacts.map((contact) => (
                <TableRow
                  key={contact.id}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() =>
                    router.push(`/dashboard/contacts/${contact.id}/edit`)
                  }
                >
                  <TableCell className="font-medium">{contact.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={contactTypeBadgeColors[contact.contact_type]}
                    >
                      {contactTypeLabels[contact.contact_type]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {contact.phone || "—"}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {contact.email || "—"}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-slate-600">
                    {contact.address || "—"}
                  </TableCell>
                  {canEdit && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(
                              `/dashboard/contacts/${contact.id}/edit`
                            );
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete?.(contact);
                          }}
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
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Showing {(currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, totalCount)} of {totalCount}{" "}
            contacts
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
