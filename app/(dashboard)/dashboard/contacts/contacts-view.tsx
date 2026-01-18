"use client";

import { useState } from "react";
import { ContactsTable } from "@/components/contacts/contacts-table";
import { DeleteDialog } from "@/components/contacts/delete-dialog";
import type { Contact } from "@/lib/actions/contacts";

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
}: ContactsViewProps) {
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);

  return (
    <>
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
        onDelete={setContactToDelete}
      />
      <DeleteDialog
        contact={contactToDelete}
        open={!!contactToDelete}
        onOpenChange={(open) => {
          if (!open) setContactToDelete(null);
        }}
      />
    </>
  );
}
