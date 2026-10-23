"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ContactsTable } from "@/components/contacts/contacts-table";
import { ContactSheet, NewContactSheet } from "@/components/contacts/contact-sheet";
import { DeleteDialog } from "@/components/contacts/delete-dialog";
import { NEW_CONTACT } from "@/components/contacts/contact-types";
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
  /** `?contact=new`: the sheet opens on the new-contact form */
  creating: boolean;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

function isDialogOpen(): boolean {
  return !!document.querySelector(
    '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [role="menu"], [role="listbox"]'
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
  creating: creatingParam,
}: ContactsViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Highlights the clicked row right away while the details load
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  // Editing happens in the sheet, in place of the details
  const [editingId, setEditingId] = useState<string | null>(null);

  const selectedId =
    isPending && pendingId !== null
      ? pendingId
      : (details?.contact.id ?? (creatingParam ? NEW_CONTACT : null));
  const selectedIndex = contacts.findIndex((c) => c.id === selectedId);
  const creating = selectedId === NEW_CONTACT;
  const editing = !creating && details !== null && editingId === details.contact.id;

  // Selection replaces history so stepping through contacts doesn't flood back
  const select = useCallback(
    (id: string | null) => {
      setPendingId(id);
      setEditingId(null);
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

  const editContact = useCallback(
    (contact: Contact) => {
      if (contact.id !== details?.contact.id) select(contact.id);
      setEditingId(contact.id);
    },
    [details, select]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target) || isDialogOpen()) return;
      if (creating || editing) {
        // Only Esc while a form is open, so stray keys can't navigate away from unsaved changes
        if (e.key === "Escape") {
          if (creating) select(null);
          else setEditingId(null);
        }
        return;
      }
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
        setEditingId(details.contact.id);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectOffset, select, selectedId, canEdit, details, creating, editing]);

  const sheetOpen = creating || (details !== null && (selectedId === details.contact.id || isPending));

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
          onCreate={() => select(NEW_CONTACT)}
          onEdit={editContact}
          onDelete={setContactToDelete}
        />
      </div>

      {sheetOpen && (creating || details) && (
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
              isPending && !creating && "opacity-60"
            )}
          >
            {creating ? (
              <NewContactSheet onClose={() => select(null)} onSaved={select} />
            ) : details && (
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
                onEdit={() => setEditingId(details.contact.id)}
                onDelete={() => setContactToDelete(details.contact)}
                editing={editing}
                onCancelEdit={() => setEditingId(null)}
                onSaved={() => {
                  setEditingId(null);
                  router.refresh();
                }}
              />
            )}
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
