"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogPost } from "./log-post";
import { getLogDateParts } from "./log-dates";
import type { LogPostIndex, LogPostWithImages } from "@/lib/types/log";

const ALL_AUTHORS = "all";
const MAX_TICKS = 12;

interface LogPostsListProps {
  posts: LogPostWithImages[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  search: string;
  authorId: string;
  hasPhotos: boolean;
  index: LogPostIndex;
  currentUserId: string;
  isAdmin: boolean;
  canCreate: boolean;
}

interface MonthGroup {
  key: string;
  label: string;
  posts: LogPostWithImages[];
}

interface IndexMonth {
  key: string;
  label: string;
  count: number;
  page: number;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

export function LogPostsList({
  posts,
  totalCount,
  currentPage,
  pageSize,
  search: initialSearch,
  authorId,
  hasPhotos,
  index,
  currentUserId,
  isAdmin,
  canCreate,
}: LogPostsListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(initialSearch);
  const [activeMonth, setActiveMonth] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const totalPages = Math.ceil(totalCount / pageSize);
  const hasFilters = Boolean(initialSearch || authorId || hasPhotos);

  const groups = useMemo<MonthGroup[]>(() => {
    const result: MonthGroup[] = [];
    for (const post of posts) {
      const { monthKey, monthLabel } = getLogDateParts(post.created_at);
      const last = result[result.length - 1];
      if (last?.key === monthKey) {
        last.posts.push(post);
      } else {
        result.push({ key: monthKey, label: monthLabel, posts: [post] });
      }
    }
    return result;
  }, [posts]);

  // Month navigator built from every matching post, not just this page
  const years = useMemo(() => {
    const byYear: { year: string; months: IndexMonth[] }[] = [];
    index.dates.forEach((iso, i) => {
      const { monthKey, shortMonth, year } = getLogDateParts(iso);
      let yearEntry = byYear[byYear.length - 1];
      if (yearEntry?.year !== year) {
        yearEntry = { year, months: [] };
        byYear.push(yearEntry);
      }
      const month = yearEntry.months[yearEntry.months.length - 1];
      if (month?.key === monthKey) {
        month.count++;
      } else {
        yearEntry.months.push({
          key: monthKey,
          label: shortMonth,
          count: 1,
          page: Math.floor(i / pageSize) + 1,
        });
      }
    });
    return byYear;
  }, [index.dates, pageSize]);

  // "/" focuses search, "c" starts a new post
  useEffect(() => {
    // "g c" is the go-to-Contacts shortcut, so a "c" right after "g" isn't ours
    let lastG = 0;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === "c" && canCreate && Date.now() - lastG > 1000) {
        e.preventDefault();
        router.push("/dashboard/log/new");
      }
      lastG = e.key === "g" ? Date.now() : 0;
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [canCreate, router]);

  // Highlight the month currently at the top of the feed
  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>("[data-month]");
    if (sections.length === 0) return;
    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const key = (entry.target as HTMLElement).dataset.month!;
          if (entry.isIntersecting) {
            visible.set(key, entry.boundingClientRect.top);
          } else {
            visible.delete(key);
          }
        }
        const topmost = [...visible].sort((a, b) => a[1] - b[1])[0];
        if (topmost) setActiveMonth(topmost[0]);
      },
      { root: document.querySelector("main"), rootMargin: "-45px 0px -50% 0px" }
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [groups]);

  const buildUrl = (params: Record<string, string | number>) => {
    const url = new URL(window.location.href);
    url.hash = "";
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, String(value));
      } else {
        url.searchParams.delete(key);
      }
    });
    return url.pathname + url.search;
  };

  const updateUrl = (params: Record<string, string | number>) => {
    startTransition(() => {
      router.push(buildUrl(params));
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateUrl({ search, page: 1 });
  };

  const clearFilters = () => {
    setSearch("");
    updateUrl({ search: "", author: "", photos: "", page: 1 });
  };

  const handlePostDeleted = () => {
    router.refresh();
  };

  const monthHref = (month: IndexMonth) =>
    month.page === currentPage
      ? `#m-${month.key}`
      : `${buildUrl({ page: month.page })}#m-${month.key}`;

  return (
    <div data-flush className="flex min-h-full flex-col">
      {/* Toolbar */}
      <div className="z-20 flex flex-wrap items-center gap-2 border-b bg-background px-4 py-2 lg:sticky lg:top-0">
        <form onSubmit={handleSearch} className="flex w-full sm:w-72">
          <label className="flex h-7 flex-1 items-center gap-2 rounded-md border px-2 focus-within:border-ring">
            <Search className="size-3.5 text-muted-foreground" />
            <span className="sr-only">Search posts</span>
            <input
              ref={searchRef}
              type="search"
              placeholder="Search posts"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
            />
            <kbd className="hidden sm:inline-flex">/</kbd>
          </label>
        </form>

        <Select
          value={authorId || ALL_AUTHORS}
          onValueChange={(value) =>
            updateUrl({ author: value === ALL_AUTHORS ? "" : value, page: 1 })
          }
        >
          <SelectTrigger size="sm" className="!h-7 px-2 text-xs" aria-label="Author">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_AUTHORS}>All authors</SelectItem>
            {index.authors.map((author) => (
              <SelectItem key={author.id} value={author.id}>
                {author.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-pressed={hasPhotos}
          onClick={() => updateUrl({ photos: hasPhotos ? "" : "1", page: 1 })}
          className={cn(
            "h-7 px-2 font-mono text-[11px] tracking-wide",
            hasPhotos && "border-brand bg-brand/10 text-foreground hover:bg-brand/15"
          )}
        >
          HAS PHOTOS
        </Button>

        {hasFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-7 px-2 text-xs text-muted-foreground"
          >
            <X className="size-3.5" />
            Clear
          </Button>
        )}

        <div className="flex-1" />

        <span
          className={cn(
            "font-mono text-[11px] text-muted-foreground transition-opacity",
            isPending && "opacity-50"
          )}
        >
          {totalCount} {totalCount === 1 ? "POST" : "POSTS"}
        </span>

        {canCreate && (
          <Button size="sm" className="h-7 px-2.5 text-xs" asChild>
            <Link href="/dashboard/log/new">
              <Plus className="size-3.5" />
              New post <kbd className="ml-0.5 hidden border-white/30 text-white/70 sm:inline-flex">C</kbd>
            </Link>
          </Button>
        )}
      </div>

      <div className="flex flex-1">
        {/* Month navigator */}
        {years.length > 0 && (
          <nav
            aria-label="Jump to month"
            className="sticky top-[45px] hidden h-[calc(100dvh-89px)] w-40 shrink-0 self-start overflow-y-auto border-r px-2 py-3 lg:block"
          >
            <div className="flex flex-col gap-2.5">
              {years.map((y) => (
                <div key={y.year} className="flex flex-col gap-px">
                  <span className="px-2 pb-1 font-mono text-[10px] tracking-[0.08em] text-muted-foreground">
                    {y.year}
                  </span>
                  {y.months.map((month) => {
                    const isActive = month.key === activeMonth;
                    return (
                      <a
                        key={month.key}
                        href={monthHref(month)}
                        aria-current={isActive ? "true" : undefined}
                        className={cn(
                          "flex h-6 items-center gap-2 rounded-md px-2 font-mono text-[11px] uppercase transition-colors",
                          isActive
                            ? "bg-accent text-foreground"
                            : "text-zinc-700 hover:bg-accent/60"
                        )}
                      >
                        <span className="w-7">{month.label}</span>
                        <span className="flex flex-1 gap-0.5" aria-hidden="true">
                          {Array.from({ length: Math.min(month.count, MAX_TICKS) }, (_, i) => (
                            <span
                              key={i}
                              className={cn(
                                "h-2.5 w-[3px]",
                                isActive ? "bg-brand" : "bg-zinc-300"
                              )}
                            />
                          ))}
                        </span>
                        <span className="text-muted-foreground">{month.count}</span>
                      </a>
                    );
                  })}
                </div>
              ))}
            </div>
          </nav>
        )}

        {/* Feed */}
        <div className="min-w-0 flex-1">
          {posts.length === 0 ? (
            <div className="flex flex-col items-center gap-1 px-4 py-16 text-center">
              <p className="text-sm font-medium">
                {hasFilters ? "No posts match these filters" : "No posts yet"}
              </p>
              <p className="text-xs text-muted-foreground">
                {hasFilters
                  ? "Try a different search or clear the filters."
                  : "Create the first post to start the log."}
              </p>
            </div>
          ) : (
            groups.map((group) => (
              <section
                key={group.key}
                id={`m-${group.key}`}
                data-month={group.key}
                aria-labelledby={`m-${group.key}-label`}
                className="scroll-mt-0 lg:scroll-mt-[45px]"
              >
                <h2
                  id={`m-${group.key}-label`}
                  className="z-10 flex gap-2.5 border-b bg-zinc-50 px-4 py-1.5 font-mono text-[10px] font-normal tracking-[0.08em] text-zinc-600 uppercase lg:sticky lg:top-[45px] lg:px-5"
                >
                  {group.label}
                  <span className="text-muted-foreground">{group.posts.length}</span>
                </h2>
                {group.posts.map((post) => (
                  <LogPost
                    key={post.id}
                    post={post}
                    canEdit={isAdmin || post.author_id === currentUserId}
                    canDelete={isAdmin}
                    onDeleted={handlePostDeleted}
                  />
                ))}
              </section>
            ))
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex h-10 items-center gap-3 border-t px-4 font-mono text-[11px] text-muted-foreground lg:px-5">
              <span className="flex-1">
                {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalCount)} OF{" "}
                {totalCount}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="size-7"
                onClick={() => updateUrl({ page: currentPage - 1 })}
                disabled={currentPage <= 1 || isPending}
              >
                <ChevronLeft className="size-4" />
                <span className="sr-only">Previous page</span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-7"
                onClick={() => updateUrl({ page: currentPage + 1 })}
                disabled={currentPage >= totalPages || isPending}
              >
                <ChevronRight className="size-4" />
                <span className="sr-only">Next page</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
