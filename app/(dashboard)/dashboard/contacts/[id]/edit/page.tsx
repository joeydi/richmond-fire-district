import { redirect } from "next/navigation";

interface EditContactPageProps {
  params: Promise<{ id: string }>;
}

// Contacts are edited in the side sheet on the list; keep old links working
export default async function EditContactPage({ params }: EditContactPageProps) {
  const { id } = await params;
  redirect(`/dashboard/contacts?contact=${id}`);
}
