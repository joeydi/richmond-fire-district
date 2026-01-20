import { redirect } from "next/navigation";
import { requireEditor, isAdmin, getUserProfile } from "@/lib/auth/roles";
import { getUsers } from "@/lib/actions/users";
import { LogPostForm } from "@/components/log/log-post-form";

export default async function NewLogPostPage() {
  let profile;
  try {
    profile = await requireEditor();
  } catch {
    redirect("/dashboard/log");
  }

  const userIsAdmin = await isAdmin();

  // Admins can create posts for other users
  let users;
  if (userIsAdmin) {
    try {
      users = await getUsers();
    } catch {
      users = [];
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-lg border bg-white p-6">
        <LogPostForm
          users={users}
          isAdmin={userIsAdmin}
          currentUserId={profile.id}
        />
      </div>
    </div>
  );
}
