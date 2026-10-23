import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const CONTEXT_CHARS = 90;

export interface LogMention {
  id: string;
  created_at: string;
  authorName: string;
  /** Text around the first match, with ellipses where it was cut */
  before: string;
  match: string;
  after: string;
}

function stripMarkdown(content: string): string {
  return content
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_#>`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Log posts whose text contains any of the given terms (case-insensitive),
 * newest first, each with an excerpt around its earliest match.
 */
export async function findLogMentions(
  supabase: SupabaseServerClient,
  terms: string[],
  limit = 5
): Promise<LogMention[]> {
  const usable = terms.map((t) => t.trim()).filter((t) => t.length > 0);
  if (usable.length === 0) return [];

  // Quote each value so commas or parentheses in a term can't break the filter
  const filter = usable.map((t) => `content.ilike."%${t.replace(/"/g, "")}%"`).join(",");
  const { data, error } = await supabase
    .from("log_posts")
    .select("id, content, created_at, author:profiles!author_id(full_name, email)")
    .or(filter)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("Error fetching log mentions:", error);
    return [];
  }

  const mentions: LogMention[] = [];
  for (const post of (data ?? []) as unknown as {
    id: string;
    content: string;
    created_at: string;
    author: { full_name: string | null; email: string } | null;
  }[]) {
    const text = stripMarkdown(post.content);
    const lower = text.toLowerCase();
    let index = -1;
    let length = 0;
    for (const term of usable) {
      const i = lower.indexOf(term.toLowerCase());
      if (i !== -1 && (index === -1 || i < index)) {
        index = i;
        length = term.length;
      }
    }
    if (index === -1) continue;
    const start = Math.max(0, index - CONTEXT_CHARS);
    const end = Math.min(text.length, index + length + CONTEXT_CHARS);
    mentions.push({
      id: post.id,
      created_at: post.created_at,
      authorName: post.author?.full_name || post.author?.email || "Unknown",
      before: (start > 0 ? "…" : "") + text.slice(start, index),
      match: text.slice(index, index + length),
      after: text.slice(index + length, end) + (end < text.length ? "…" : ""),
    });
  }
  return mentions;
}
