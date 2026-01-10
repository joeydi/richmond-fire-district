import { redirect } from "next/navigation";
import { requireEditor } from "@/lib/auth/roles";
import { getContactTypeOptions } from "@/lib/actions/contacts";
import { ContactForm } from "@/components/contacts/contact-form";

export default async function NewContactPage() {
  try {
    await requireEditor();
  } catch {
    redirect("/dashboard/contacts");
  }

  const contactTypes = await getContactTypeOptions();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Add New Contact</h1>
        <p className="mt-1 text-sm text-slate-600">
          Add a new contact to the directory
        </p>
      </div>
      <div className="rounded-lg border bg-white p-6">
        <ContactForm contactTypes={contactTypes} />
      </div>
    </div>
  );
}
