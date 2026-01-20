import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/roles";
import { getUser } from "@/lib/actions/users";
import { EditUserForm } from "./edit-user-form";

interface EditUserPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditUserPage({ params }: EditUserPageProps) {
  const { id } = await params;
  const admin = await requireAdmin();
  const user = await getUser(id);

  if (!user) {
    notFound();
  }

  const isOwnAccount = admin.id === user.id;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <EditUserForm user={user} isOwnAccount={isOwnAccount} />
    </div>
  );
}
