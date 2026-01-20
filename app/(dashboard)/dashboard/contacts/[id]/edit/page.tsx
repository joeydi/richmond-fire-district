import { notFound, redirect } from "next/navigation";
import { requireEditor } from "@/lib/auth/roles";
import { getContact, getContactTypeOptions } from "@/lib/actions/contacts";
import { ContactForm } from "@/components/contacts/contact-form";

interface EditContactPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditContactPage({ params }: EditContactPageProps) {
  try {
    await requireEditor();
  } catch {
    redirect("/dashboard/contacts");
  }

  const { id } = await params;
  const [contact, contactTypes] = await Promise.all([
    getContact(id),
    getContactTypeOptions(),
  ]);

  if (!contact) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-lg border bg-white p-6">
        <ContactForm contact={contact} contactTypes={contactTypes} />
      </div>
    </div>
  );
}
