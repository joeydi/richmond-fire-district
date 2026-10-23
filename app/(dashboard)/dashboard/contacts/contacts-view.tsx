"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ContactsTable } from "@/components/contacts/contacts-table";
import { ContactSheet } from "@/components/contacts/contact-sheet";
import { DeleteDialog } from "@/components/contacts/delete-dialog";
import type { Contact, ContactDetails } from "@/lib/actions/contacts";

interface ContactsViewProps {
  contacts: Contact[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  search: string;
  typeFilter: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
  canEdit: boolean;
  details: ContactDetails | null;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

function isDialogOpen(): boolean {
  return !!document.querySelector(
    '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [role="menu"]'
  );
}

export function ContactsView({
  contacts,
  totalCount,
  currentPage,
  pageSize,
  search,
  typeFilter,
  sortBy,
  sortOrder,
  canEdit,
  details,
}: ContactsViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Highlights the clicked row right away while the details load
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);

  const selectedId = isPending && pendingId !== null ? pendingId : (details?.contact.id ?? null);
  const selectedIndex = contacts.findIndex((c) => c.id === selectedId);

  // Selection replaces history so stepping through contacts doesn't flood back
  const select = useCallback(
    (id: string | null) => {
      setPendingId(id);
      const url = new URL(window.location.href);
      if (id) url.searchParams.set("contact", id);
      else url.searchParams.delete("contact");
      startTransition(() => {
        router.replace(url.pathname + url.search, { scroll: false });
      });
    },
    [router]
  );

  const selectOffset = useCallback(
    (offset: number) => {
      const next = contacts[selectedIndex === -1 ? 0 : selectedIndex + offset];
      if (next) {
        select(next.id);
        document.querySelector(`[data-contact-id="${next.id}"]`)?.scrollIntoView({ block: "nearest" });
      }
    },
    [contacts, selectedIndex, select]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target) || isDialogOpen()) return;
      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        selectOffset(1);
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        selectOffset(-1);
      } else if (e.key === "Escape" && selectedId) {
        select(null);
      } else if (e.key === "e" && canEdit && details) {
        e.preventDefault();
        router.push(`/dashboard/contacts/${details.contact.id}/edit`);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectOffset, select, selectedId, canEdit, details, router]);

  const sheetOpen = details !== null && (selectedId === details.contact.id || isPending);

  return (
    <div data-flush className="flex h-full">
      <div className="min-w-0 flex-1 overflow-y-auto">
        <ContactsTable
          contacts={contacts}
          totalCount={totalCount}
          currentPage={currentPage}
          pageSize={pageSize}
          search={search}
          typeFilter={typeFilter}
          sortBy={sortBy}
          sortOrder={sortOrder}
          canEdit={canEdit}
          selectedId={selectedId}
          onSelect={(contact) => select(contact.id === selectedId ? null : contact.id)}
          onDelete={setContactToDelete}
        />
      </div>

      {sheetOpen && details && (
        <>
          {/* Below lg the sheet overlays the list */}
          <div
            aria-hidden="true"
            className="fixed inset-0 z-30 bg-zinc-950/20 lg:hidden"
            onClick={() => select(null)}
          />
          <div
            className={cn(
              "fixed inset-y-0 right-0 z-40 w-full max-w-[420px] border-l shadow-lg transition-opacity",
              "lg:static lg:z-auto lg:w-[380px] lg:max-w-none lg:shrink-0 lg:shadow-[-8px_0_24px_-16px_rgb(24_24_27/0.18)]",
              isPending && "opacity-60"
            )}
          >
            <ContactSheet
              details={details}
              canEdit={canEdit}
              positionLabel={
                selectedIndex === -1
                  ? null
                  : `${(currentPage - 1) * pageSize + selectedIndex + 1} / ${totalCount}`
              }
              onClose={() => select(null)}
              onPrev={selectedIndex > 0 ? () => selectOffset(-1) : undefined}
              onNext={
                selectedIndex !== -1 && selectedIndex < contacts.length - 1
                  ? () => selectOffset(1)
                  : undefined
              }
              onDelete={() => setContactToDelete(details.contact)}
            />
          </div>
        </>
      )}

      <DeleteDialog
        contact={contactToDelete}
        open={!!contactToDelete}
        onOpenChange={(open) => {
          if (!open) setContactToDelete(null);
        }}
      />
    </div>
  );
}
