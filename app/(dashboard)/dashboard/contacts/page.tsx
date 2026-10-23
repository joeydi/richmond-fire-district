import {
  getContactDetails,
  getContacts,
  type Contact,
  type ContactType,
} from "@/lib/actions/contacts";
import { canEdit } from "@/lib/auth/roles";
import { NEW_CONTACT } from "@/components/contacts/contact-types";
import { ContactsView } from "./contacts-view";

interface ContactsPageProps {
  searchParams: Promise<{
    search?: string;
    type?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: string;
    contact?: string;
  }>;
}

export default async function ContactsPage({ searchParams }: ContactsPageProps) {
  const params = await searchParams;
  const search = params.search || "";
  const typeFilter = params.type || "all";
  const sortBy = (params.sortBy as keyof Contact) || "name";
  const sortOrder = (params.sortOrder as "asc" | "desc") || "asc";
  const page = parseInt(params.page || "1", 10);
  const pageSize = 100;
  const creating = params.contact === NEW_CONTACT;

  const [{ data: contacts, count }, userCanEdit, details] = await Promise.all([
    getContacts({
      search,
      type: typeFilter as ContactType | "all",
      sortBy,
      sortOrder,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    canEdit(),
    params.contact && !creating ? getContactDetails(params.contact) : null,
  ]);

  return (
    <ContactsView
      contacts={contacts}
      totalCount={count}
      currentPage={page}
      pageSize={pageSize}
      search={search}
      typeFilter={typeFilter}
      sortBy={sortBy}
      sortOrder={sortOrder}
      canEdit={userCanEdit}
      details={details}
      creating={creating && userCanEdit}
    />
  );
}
