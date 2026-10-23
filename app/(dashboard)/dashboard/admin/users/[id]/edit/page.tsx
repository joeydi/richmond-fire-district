import { redirect } from "next/navigation";

interface EditUserPageProps {
  params: Promise<{ id: string }>;
}

// Users are edited in the side sheet on the list; keep old links working
export default async function EditUserPage({ params }: EditUserPageProps) {
  const { id } = await params;
  redirect(`/dashboard/admin/users?user=${id}`);
}
