import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import type { LogPostWithImages } from "@/lib/types/log";

interface RecentPostsProps {
  posts: LogPostWithImages[];
}

function truncateContent(content: string, maxLength: number = 100): string {
  // Remove markdown formatting for preview
  const plainText = content
    .replace(/#{1,6}\s/g, "") // headers
    .replace(/\*\*|__/g, "") // bold
    .replace(/\*|_/g, "") // italic
    .replace(/`{1,3}[^`]*`{1,3}/g, "") // code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links
    .replace(/\n+/g, " ") // newlines
    .trim();

  if (plainText.length <= maxLength) return plainText;
  return plainText.slice(0, maxLength).trim() + "...";
}

export function RecentPosts({ posts }: RecentPostsProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-medium">Recent Posts</CardTitle>
        <Link
          href="/dashboard/log"
          className="text-sm text-blue-600 hover:underline"
        >
          View All
        </Link>
      </CardHeader>
      <CardContent>
        {posts.length === 0 ? (
          <p className="text-center text-sm text-slate-500 py-8">
            No posts yet
          </p>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/dashboard/log/${post.id}`}
                className="block rounded-lg border p-3 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-700 line-clamp-2">
                      {truncateContent(post.content)}
                    </p>
                    {post.author && (
                      <p className="mt-1 text-xs text-slate-500">
                        {post.author.full_name || post.author.email}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-slate-500 whitespace-nowrap">
                    {formatDistanceToNow(new Date(post.created_at), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
