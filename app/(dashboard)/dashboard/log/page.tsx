import { getLogPost, getLogPostIndex, getLogPosts } from "@/lib/actions/log";
import { getUserProfile, isAdmin, canEdit } from "@/lib/auth/roles";
import { getUsers } from "@/lib/actions/users";
import { LogPostsList } from "@/components/log/log-posts-list";
import { NEW_POST } from "@/lib/types/log";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface LogPageProps {
  searchParams: Promise<{
    search?: string;
    author?: string;
    photos?: string;
    page?: string;
    compose?: string;
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
  const compose = params.compose ?? null;
  // A post being edited may not be on this page of the feed (an old link, a filter)
  const composeId = compose && compose !== NEW_POST && UUID.test(compose) ? compose : null;

  const [{ data: posts, count }, index, profile, userIsAdmin, userCanEdit, composePost] = await Promise.all([
    getLogPosts({
      ...filters,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    getLogPostIndex(filters),
    getUserProfile(),
    isAdmin(),
    canEdit(),
    composeId ? getLogPost(composeId) : null,
  ]);

  // The composer's author picker; admins can post for anyone
  const users = userIsAdmin ? await getUsers().catch(() => []) : undefined;

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
      users={users}
      currentUserName={profile?.full_name || profile?.email || ""}
      composePost={composePost}
    />
  );
}
