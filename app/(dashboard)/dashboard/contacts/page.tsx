import { getContacts, type Contact } from "@/lib/actions/contacts";
import { canEdit } from "@/lib/auth/roles";
import { ContactsView } from "./contacts-view";

interface ContactsPageProps {
  searchParams: Promise<{
    search?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: string;
  }>;
}

export default async function ContactsPage({ searchParams }: ContactsPageProps) {
  const params = await searchParams;
  const search = params.search || "";
  const sortBy = (params.sortBy as keyof Contact) || "name";
  const sortOrder = (params.sortOrder as "asc" | "desc") || "asc";
  const page = parseInt(params.page || "1", 10);
  const pageSize = 20;

  const [{ data: contacts, count }, userCanEdit] = await Promise.all([
    getContacts({
      search,
      sortBy,
      sortOrder,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    canEdit(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Contacts</h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage contact directory for the water system
        </p>
      </div>
      <ContactsView
        contacts={contacts}
        totalCount={count}
        currentPage={page}
        pageSize={pageSize}
        search={search}
        sortBy={sortBy}
        sortOrder={sortOrder}
        canEdit={userCanEdit}
      />
    </div>
  );
}
