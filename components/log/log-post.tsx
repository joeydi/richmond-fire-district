"use client";

import { useState } from "react";
import Link from "next/link";
import { MoreHorizontal, Pencil, Trash2, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { LogPostContent } from "./log-post-content";
import { LogImageGallery } from "./log-image-gallery";
import { getLogDateParts } from "./log-dates";
import { DeleteConfirmDialog } from "@/components/map/delete-confirm-dialog";
import { deleteLogPost } from "@/lib/actions/log";
import type { LogPostWithImages } from "@/lib/types/log";

interface LogPostProps {
  post: LogPostWithImages;
  canEdit?: boolean;
  canDelete?: boolean;
  onDeleted?: () => void;
  showPermalink?: boolean;
  /** Opens the log page's edit sheet in place; without it the button links there */
  onEdit?: () => void;
  className?: string;
}

export function LogPost({
  post,
  canEdit = false,
  canDelete = false,
  onDeleted,
  showPermalink = true,
  onEdit,
  className,
}: LogPostProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const authorName = post.author?.full_name || post.author?.email || "Unknown";
  const { date, time } = getLogDateParts(post.created_at);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteLogPost(post.id);
      if (result.success) {
        toast.success("Post deleted successfully");
        onDeleted?.();
      } else {
        toast.error(result.error || "Failed to delete post");
      }
    } catch {
      toast.error("Failed to delete post");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/dashboard/log/${post.id}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  };

  return (
    <>
      <article
        id={post.id}
        className={cn(
          "group grid scroll-mt-20 grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1.5 border-b border-zinc-100 py-3 pr-3 pl-4 transition-colors hover:bg-zinc-50/60 sm:grid-cols-[148px_minmax(0,1fr)_auto] sm:gap-x-6 lg:pl-5",
          className
        )}
      >
        <div className="flex flex-col gap-0.5">
          <time dateTime={post.created_at} className="font-mono text-xs">
            {date} <span className="text-muted-foreground">{time}</span>
          </time>
          <span className="text-xs text-muted-foreground">{authorName}</span>
        </div>

        <div className="col-span-2 row-start-2 flex max-w-[760px] min-w-0 flex-col gap-2.5 sm:col-span-1 sm:row-start-auto">
          <LogPostContent content={post.content} />
          {post.images.length > 0 && (
            <LogImageGallery images={post.images} canEdit={false} variant="compact" />
          )}
        </div>

        <div className="flex items-start gap-0.5 transition-opacity lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100">
          {showPermalink && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground"
              onClick={handleCopyLink}
              title="Copy link"
            >
              <LinkIcon className="size-3.5" />
              <span className="sr-only">Copy link to post</span>
            </Button>
          )}
          {canEdit &&
            (onEdit ? (
              <Button variant="ghost" size="icon" className="size-7 text-muted-foreground" onClick={onEdit} title="Edit post">
                <Pencil className="size-3.5" />
                <span className="sr-only">Edit post</span>
              </Button>
            ) : (
              <Button variant="ghost" size="icon" className="size-7 text-muted-foreground" asChild>
                <Link href={`/dashboard/log?compose=${post.id}`} title="Edit post">
                  <Pencil className="size-3.5" />
                  <span className="sr-only">Edit post</span>
                </Link>
              </Button>
            ))}
          {canDelete && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-7 text-muted-foreground">
                  <MoreHorizontal className="size-4" />
                  <span className="sr-only">More actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  onClick={() => setDeleteDialogOpen(true)}
                  className="cursor-pointer text-red-600 focus:text-red-600"
                >
                  <Trash2 className="mr-2 size-4" />
                  Delete post
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </article>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Post"
        description="Are you sure you want to delete this post? This action cannot be undone and will also delete all associated images."
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
    </>
  );
}
