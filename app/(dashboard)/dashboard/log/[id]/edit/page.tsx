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
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-lg border bg-white p-6">
        <LogPostForm
          post={post}
          users={users}
          isAdmin={userIsAdmin}
          currentUserId={profile?.id || ""}
        />
      </div>
    </div>
  );
}
