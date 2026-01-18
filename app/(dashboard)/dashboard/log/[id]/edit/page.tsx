import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getLogPost, canEditLogPost } from "@/lib/actions/log";
import { getUsers } from "@/lib/actions/users";
import { getUserProfile, isAdmin } from "@/lib/auth/roles";
import { LogPostForm } from "@/components/log/log-post-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

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
      <div>
        <Link href="/dashboard/log">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Log
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Edit Post</h1>
        <p className="mt-1 text-sm text-slate-600">
          Update your post about the water system
        </p>
      </div>
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
