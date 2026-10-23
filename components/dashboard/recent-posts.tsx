import Link from "next/link";
import { getLogDateParts } from "@/components/log/log-dates";
import type { LogPostWithImages } from "@/lib/types/log";

interface RecentPostsProps {
  posts: LogPostWithImages[];
}

function toPlainText(content: string): string {
  // Remove markdown formatting for preview
  return content
    .replace(/#{1,6}\s/g, "") // headers
    .replace(/\*\*|__/g, "") // bold
    .replace(/\*|_/g, "") // italic
    .replace(/`{1,3}[^`]*`{1,3}/g, "") // code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links
    .replace(/\n+/g, " ") // newlines
    .trim();
}

export function RecentPosts({ posts }: RecentPostsProps) {
  return (
    <section aria-label="Recent log posts" className="min-w-0">
      <div className="flex h-9 items-center gap-2.5 border-b px-4">
        <h2 className="text-[13px] font-semibold">Log</h2>
        <div className="flex-1" />
        <Link href="/dashboard/log" className="font-mono text-[11px] text-zinc-600 hover:text-foreground">
          ALL →
        </Link>
      </div>
      {posts.length === 0 ? (
        <p className="px-4 py-8 text-center text-xs text-muted-foreground">No posts yet</p>
      ) : (
        <ul>
          {posts.map((post) => {
            const { date } = getLogDateParts(post.created_at);
            const author = post.author?.full_name || post.author?.email;
            return (
              <li key={post.id}>
                <Link
                  href={`/dashboard/log/${post.id}`}
                  className="flex flex-col gap-0.5 border-b border-zinc-100 px-4 py-[7px] transition-colors hover:bg-zinc-50"
                >
                  <span className="truncate text-xs">{toPlainText(post.content)}</span>
                  <span className="font-mono text-[10px] text-muted-foreground uppercase">
                    {date}
                    {author && ` · ${author}`}
                    {post.images.length > 0 &&
                      ` · ${post.images.length} ${post.images.length === 1 ? "photo" : "photos"}`}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
