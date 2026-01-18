"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Pencil, Trash2, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { LogPostContent } from "./log-post-content";
import { LogImageGallery } from "./log-image-gallery";
import { DeleteConfirmDialog } from "@/components/map/delete-confirm-dialog";
import { deleteLogPost } from "@/lib/actions/log";
import type { LogPostWithImages } from "@/lib/types/log";

interface LogPostProps {
  post: LogPostWithImages;
  canEdit?: boolean;
  canDelete?: boolean;
  onDeleted?: () => void;
  showPermalink?: boolean;
}

export function LogPost({
  post,
  canEdit = false,
  canDelete = false,
  onDeleted,
  showPermalink = true,
}: LogPostProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const authorName = post.author?.full_name || post.author?.email || "Unknown";
  const formattedDate = format(new Date(post.created_at), "MMMM d, yyyy 'at' h:mm a");
  const wasEdited = post.updated_at !== post.created_at;

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
      <Card>
        <CardContent className="space-y-4">
          <LogPostContent content={post.content} />

          {post.images.length > 0 && (
            <LogImageGallery images={post.images} canEdit={false} />
          )}
        </CardContent>
        <CardFooter className="flex items-center justify-between gap-4 border-t pt-4">
          <div className="text-sm text-slate-500">
            <span className="font-medium text-slate-700">{authorName}</span>
            {" · "}
            {formattedDate}
            {wasEdited && " (edited)"}
          </div>
          <div className="flex items-center gap-1">
            {showPermalink && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleCopyLink}
                title="Copy link"
              >
                <LinkIcon className="h-4 w-4" />
              </Button>
            )}
            {canEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                asChild
              >
                <Link href={`/dashboard/log/${post.id}/edit`} title="Edit post">
                  <Pencil className="h-4 w-4" />
                </Link>
              </Button>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => setDeleteDialogOpen(true)}
                title="Delete post"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>

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
