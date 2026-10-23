import { notFound, redirect } from "next/navigation";
import { getLogPost, canEditLogPost } from "@/lib/actions/log";
import { getUsers } from "@/lib/actions/users";
import { getUserProfile, isAdmin } from "@/lib/auth/roles";
import { LogPostForm } from "@/components/log/log-post-form";

interface EditLogPostPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditLogPostPage({ params }: EditLogPostPageProps) {
  const { id } = await params;

  const [post, profile, userIsAdmin, userCanEdit] = await Promise.all([
    getLogPost(id),
    getUserProfile(),
    isAdmin(),
    canEditLogPost(id),
  ]);

  if (!post) {
    notFound();
  }

  if (!userCanEdit) {
    redirect("/dashboard/log");
  }

  // Admins can change the author
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
      post={post}
      users={users}
      isAdmin={userIsAdmin}
      currentUserId={profile?.id || ""}
      currentUserName={profile?.full_name || profile?.email || ""}
    />
  );
}
