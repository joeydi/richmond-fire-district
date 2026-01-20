import Link from "next/link";
import { getLogPosts } from "@/lib/actions/log";
import { getUserProfile, isAdmin, canEdit } from "@/lib/auth/roles";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { LogPostsList } from "@/components/log/log-posts-list";

interface LogPageProps {
  searchParams: Promise<{
    search?: string;
    page?: string;
  }>;
}

export default async function LogPage({ searchParams }: LogPageProps) {
  const params = await searchParams;
  const search = params.search || "";
  const page = parseInt(params.page || "1", 10);
  const pageSize = 100;

  const [{ data: posts, count }, profile, userIsAdmin, userCanEdit] = await Promise.all([
    getLogPosts({
      search,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    getUserProfile(),
    isAdmin(),
    canEdit(),
  ]);

  return (
    <div className="space-y-6">
      {userCanEdit && (
        <div className="flex justify-end">
          <Link href="/dashboard/log/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Post
            </Button>
          </Link>
        </div>
      )}
      <LogPostsList
        posts={posts}
        totalCount={count}
        currentPage={page}
        pageSize={pageSize}
        search={search}
        currentUserId={profile?.id || ""}
        isAdmin={userIsAdmin}
      />
    </div>
  );
}
