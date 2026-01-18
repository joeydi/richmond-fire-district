import { notFound } from "next/navigation";
import Link from "next/link";
import { getLogPost } from "@/lib/actions/log";
import { getUserProfile, isAdmin } from "@/lib/auth/roles";
import { LogPost } from "@/components/log/log-post";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface LogPostPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function LogPostPage({ params }: LogPostPageProps) {
  const { id } = await params;

  const [post, profile, userIsAdmin] = await Promise.all([
    getLogPost(id),
    getUserProfile(),
    isAdmin(),
  ]);

  if (!post) {
    notFound();
  }

  const canEdit = userIsAdmin || post.author_id === profile?.id;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/dashboard/log">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Log
          </Button>
        </Link>
      </div>
      <LogPost
        post={post}
        canEdit={canEdit}
        canDelete={userIsAdmin}
        showPermalink={false}
      />
    </div>
  );
}
