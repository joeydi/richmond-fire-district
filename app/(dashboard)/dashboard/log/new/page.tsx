import { redirect } from "next/navigation";
import { requireEditor, isAdmin } from "@/lib/auth/roles";
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
    <LogPostForm
      users={users}
      isAdmin={userIsAdmin}
      currentUserId={profile.id}
      currentUserName={profile.full_name || profile.email}
    />
  );
}
