"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  StickyNote,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Contact, ContactType } from "@/lib/actions/contacts";
import { contactTypeDots, contactTypeLabels } from "./contact-types";

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
  selectedId: string | null;
  onSelect: (contact: Contact) => void;
  onDelete?: (contact: Contact) => void;
}

const typeOptions: Array<{ value: ContactType | "all"; label: string }> = [
  { value: "all", label: "All types" },
  { value: "resident", label: "Resident" },
  { value: "business", label: "Business" },
  { value: "contractor", label: "Contractor" },
  { value: "utility", label: "Utility" },
  { value: "emergency", label: "Emergency" },
  { value: "other", label: "Other" },
];

const thClass =
  "border-b bg-zinc-50 px-2 py-1.5 text-left font-mono text-[10px] font-medium tracking-[0.06em] whitespace-nowrap text-muted-foreground uppercase first:pl-4 last:pr-4";
const tdClass = "px-2 py-[7px] first:pl-4 last:pr-4";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

function TypeLabel({ type }: { type: ContactType }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] whitespace-nowrap text-zinc-700 uppercase">
      <span className={cn("size-1.5 rounded-full", contactTypeDots[type])} />
      {contactTypeLabels[type]}
    </span>
  );
}

function SortHeader({
  column,
  children,
  sortBy,
  sortOrder,
  onSort,
}: {
  column: string;
  children: React.ReactNode;
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSort: (column: string) => void;
}) {
  const isSorted = sortBy === column;
  return (
    <th
      aria-sort={isSorted ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}
      className={thClass}
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
  selectedId,
  onSelect,
  onDelete,
}: ContactsTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(initialSearch);
  const searchRef = useRef<HTMLInputElement>(null);

  const totalPages = Math.ceil(totalCount / pageSize);
  const hasFilters = Boolean(initialSearch) || (typeFilter && typeFilter !== "all");

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

  const handleSort = (column: string) => {
    const newOrder = sortBy === column && sortOrder === "asc" ? "desc" : "asc";
    updateUrl({ sortBy: column, sortOrder: newOrder });
  };

  const editHref = (contact: Contact) => `/dashboard/contacts/${contact.id}/edit`;
  const sortProps = { sortBy, sortOrder, onSort: handleSort };
  const emptyMessage = hasFilters
    ? "No contacts match these filters."
    : "No contacts yet. Add your first contact to get started.";

  const actions = (contact: Contact) =>
    canEdit && (
      <div className="flex justify-end gap-0.5">
        <Button variant="ghost" size="icon" className="size-6 text-muted-foreground" asChild>
          <Link href={editHref(contact)} onClick={(e) => e.stopPropagation()} title="Edit contact">
            <Pencil className="size-3" />
            <span className="sr-only">Edit {contact.name}</span>
          </Link>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 text-muted-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="size-3.5" />
              <span className="sr-only">More actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(contact);
              }}
              className="cursor-pointer text-red-600 focus:text-red-600"
            >
              <Trash2 className="mr-2 size-4" />
              Delete contact
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );

  return (
    <div className={cn("flex min-h-full flex-col", isPending && "opacity-70")}>
      {/* Toolbar */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b bg-background px-4 py-2">
        <form onSubmit={handleSearch} className="flex w-full sm:w-64">
          <label className="flex h-7 flex-1 items-center gap-2 rounded-md border px-2 focus-within:border-ring">
            <Search className="size-3.5 text-muted-foreground" />
            <span className="sr-only">Search contacts</span>
            <input
              ref={searchRef}
              type="search"
              placeholder="Search contacts"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
            />
            <kbd className="hidden sm:inline-flex">/</kbd>
          </label>
        </form>

        <Select
          value={typeFilter || "all"}
          onValueChange={(value) => updateUrl({ type: value === "all" ? "" : value, page: 1 })}
        >
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

        <div className="flex-1" />
        <span className="font-mono text-[11px] text-muted-foreground">
          {totalCount} {totalCount === 1 ? "CONTACT" : "CONTACTS"}
        </span>
        {canEdit && (
          <Button size="sm" className="h-7 px-2.5 text-xs" asChild>
            <Link href="/dashboard/contacts/new">
              <Plus className="size-3.5" />
              Contact
            </Link>
          </Button>
        )}
      </div>

      {contacts.length === 0 ? (
        <p className="flex-1 px-4 py-16 text-center text-xs text-muted-foreground">{emptyMessage}</p>
      ) : (
        <>
          {/* Phones: stacked list with tap-to-call */}
          <ul className="flex-1 sm:hidden">
            {contacts.map((contact) => (
              <li
                key={contact.id}
                data-contact-id={contact.id}
                className={cn(
                  "flex items-start gap-3 border-b border-zinc-100 px-4 py-2.5",
                  contact.id === selectedId && "bg-brand/10"
                )}
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSelect(contact)}
                      className="truncate text-left text-[13px] font-medium underline-offset-2 hover:underline"
                    >
                      {contact.name}
                    </button>
                    <TypeLabel type={contact.contact_type} />
                  </div>
                  {contact.address && (
                    <span className="truncate text-xs text-zinc-600">{contact.address}</span>
                  )}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-xs">
                    {contact.phone && (
                      <a href={`tel:${contact.phone}`} className="text-cyan-800 underline-offset-2 hover:underline">
                        {contact.phone}
                      </a>
                    )}
                    {contact.email && (
                      <a href={`mailto:${contact.email}`} className="truncate text-cyan-800 underline-offset-2 hover:underline">
                        {contact.email}
                      </a>
                    )}
                  </div>
                </div>
                {actions(contact)}
              </li>
            ))}
          </ul>

          {/* Larger screens: table */}
          <div className="relative hidden flex-1 overflow-x-auto sm:block">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <SortHeader column="name" {...sortProps}>Name</SortHeader>
                  <SortHeader column="contact_type" {...sortProps}>Type</SortHeader>
                  <th className={thClass}>Phone</th>
                  <th className={thClass}>Email</th>
                  <SortHeader column="address" {...sortProps}>Address</SortHeader>
                  <th className={cn(thClass, "w-16")}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr
                    key={contact.id}
                    data-contact-id={contact.id}
                    aria-selected={contact.id === selectedId}
                    onClick={() => onSelect(contact)}
                    className={cn(
                      "group cursor-pointer border-b border-zinc-100 transition-colors",
                      contact.id === selectedId ? "bg-brand/10" : "hover:bg-zinc-50/70"
                    )}
                  >
                    <td className={cn(tdClass, "font-medium whitespace-nowrap")}>
                      <span className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelect(contact);
                          }}
                          className="text-left outline-none focus-visible:underline"
                        >
                          {contact.name}
                        </button>
                        {contact.notes && (
                          <StickyNote
                            className="size-3 text-muted-foreground"
                            aria-label="Has notes"
                          >
                            <title>{contact.notes}</title>
                          </StickyNote>
                        )}
                      </span>
                    </td>
                    <td className={tdClass}>
                      <TypeLabel type={contact.contact_type} />
                    </td>
                    <td className={cn(tdClass, "font-mono whitespace-nowrap")}>
                      {contact.phone ? (
                        <a
                          href={`tel:${contact.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-zinc-700 underline-offset-2 hover:text-foreground hover:underline"
                        >
                          {contact.phone}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className={cn(tdClass, "max-w-[220px] truncate")}>
                      {contact.email ? (
                        <a
                          href={`mailto:${contact.email}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-zinc-700 underline-offset-2 hover:text-foreground hover:underline"
                        >
                          {contact.email}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className={cn(tdClass, "max-w-xs truncate text-zinc-700")} title={contact.address ?? undefined}>
                      {contact.address || <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className={cn(tdClass, "py-0")}>
                      <div className="transition-opacity lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100">
                        {actions(contact)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Footer */}
      <div className="sticky bottom-0 flex h-10 shrink-0 items-center gap-3 border-t bg-background px-4 font-mono text-[11px] text-muted-foreground">
        <span className="flex-1">
          {totalCount === 0
            ? "0 CONTACTS"
            : `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, totalCount)} OF ${totalCount}`}
        </span>
        {totalPages > 1 && (
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-7"
              onClick={() => updateUrl({ page: currentPage - 1 })}
              disabled={currentPage <= 1 || isPending}
            >
              <ChevronLeft className="size-4" />
              <span className="sr-only">Previous page</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-7"
              onClick={() => updateUrl({ page: currentPage + 1 })}
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
