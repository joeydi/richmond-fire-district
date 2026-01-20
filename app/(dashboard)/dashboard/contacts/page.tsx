import Link from "next/link";
import { getContacts, type Contact, type ContactType } from "@/lib/actions/contacts";
import { canEdit } from "@/lib/auth/roles";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ContactsView } from "./contacts-view";

interface ContactsPageProps {
  searchParams: Promise<{
    search?: string;
    type?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: string;
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

  const [{ data: contacts, count }, userCanEdit] = await Promise.all([
    getContacts({
      search,
      type: typeFilter as ContactType | "all",
      sortBy,
      sortOrder,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    canEdit(),
  ]);

  return (
    <div className="space-y-6">
      {userCanEdit && (
        <div className="flex justify-end">
          <Link href="/dashboard/contacts/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Contact
            </Button>
          </Link>
        </div>
      )}
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
      />
    </div>
  );
}
