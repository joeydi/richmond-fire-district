import { getLogPostIndex, getLogPosts } from "@/lib/actions/log";
import { getUserProfile, isAdmin, canEdit } from "@/lib/auth/roles";
import { LogPostsList } from "@/components/log/log-posts-list";

interface LogPageProps {
  searchParams: Promise<{
    search?: string;
    author?: string;
    photos?: string;
    page?: string;
  }>;
}

export default async function LogPage({ searchParams }: LogPageProps) {
  const params = await searchParams;
  const search = params.search || "";
  const authorId = params.author || "";
  const hasPhotos = params.photos === "1";
  const page = parseInt(params.page || "1", 10);
  const pageSize = 100;
  const filters = { search, authorId, hasPhotos };

  const [{ data: posts, count }, index, profile, userIsAdmin, userCanEdit] = await Promise.all([
    getLogPosts({
      ...filters,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    getLogPostIndex(filters),
    getUserProfile(),
    isAdmin(),
    canEdit(),
  ]);

  return (
    <LogPostsList
      posts={posts}
      totalCount={count}
      currentPage={page}
      pageSize={pageSize}
      search={search}
      authorId={authorId}
      hasPhotos={hasPhotos}
      index={index}
      currentUserId={profile?.id || ""}
      isAdmin={userIsAdmin}
      canCreate={userCanEdit}
    />
  );
}
