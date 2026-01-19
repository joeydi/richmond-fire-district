"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { LogPost } from "./log-post";
import type { LogPostWithImages } from "@/lib/types/log";

interface LogPostsListProps {
  posts: LogPostWithImages[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  search: string;
  currentUserId: string;
  isAdmin: boolean;
}

export function LogPostsList({
  posts,
  totalCount,
  currentPage,
  pageSize,
  search: initialSearch,
  currentUserId,
  isAdmin,
}: LogPostsListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(initialSearch);

  const totalPages = Math.ceil(totalCount / pageSize);

  const updateUrl = (params: Record<string, string | number>) => {
    const url = new URL(window.location.href);
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, String(value));
      } else {
        url.searchParams.delete(key);
      }
    });
    startTransition(() => {
      router.push(url.pathname + url.search);
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateUrl({ search, page: 1 });
  };

  const handlePageChange = (page: number) => {
    updateUrl({ page });
  };

  const handlePostDeleted = () => {
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex max-w-md gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            placeholder="Search posts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="outline" disabled={isPending}>
          Search
        </Button>
      </form>

      {/* Posts list */}
      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <FileText className="h-12 w-12 mb-4" />
          <p className="text-lg font-medium text-slate-600">
            {initialSearch ? "No posts found matching your search." : "No posts yet."}
          </p>
          {!initialSearch && <p className="text-sm mt-1">Create your first post to get started.</p>}
        </div>
      ) : (
        <div className="space-y-4 xl:space-y-8">
          {posts.map((post) => (
            <LogPost
              key={post.id}
              post={post}
              canEdit={isAdmin || post.author_id === currentUserId}
              canDelete={isAdmin}
              onDeleted={handlePostDeleted}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-slate-600">
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount}{" "}
            posts
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1 || isPending}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || isPending}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
