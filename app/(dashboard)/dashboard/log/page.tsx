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
  const pageSize = 20;

  const [{ data: posts, count }, profile, userIsAdmin, userCanEdit] =
    await Promise.all([
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Log</h1>
          <p className="mt-1 text-sm text-slate-600">
            Updates and notes about the water system
          </p>
        </div>
        {userCanEdit && (
          <Link href="/dashboard/log/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Post
            </Button>
          </Link>
        )}
      </div>
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
