"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { toast } from "sonner";
import { LogContentEditor } from "./mdx-editor-wrapper";
import { LogPostImages } from "./log-post-images";
import { createLogPost, updateLogPost } from "@/lib/actions/log";
import type { LogPostWithImages } from "@/lib/types/log";
import type { Profile } from "@/lib/types/database";

interface LogPostFormProps {
  post?: LogPostWithImages;
  users?: Profile[];
  isAdmin?: boolean;
  currentUserId: string;
}

export function LogPostForm({
  post,
  users,
  isAdmin = false,
  currentUserId,
}: LogPostFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEditing = !!post;

  const [content, setContent] = useState(post?.content || "");
  const [authorId, setAuthorId] = useState(post?.author_id || currentUserId);
  const [postDate, setPostDate] = useState(() => {
    // Format for datetime-local input (YYYY-MM-DDTHH:mm)
    const date = post?.created_at ? new Date(post.created_at) : new Date();
    return format(date, "yyyy-MM-dd'T'HH:mm");
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      toast.error("Content is required");
      return;
    }

    startTransition(async () => {
      const created_at = new Date(postDate).toISOString();

      if (isEditing) {
        const updateInput: { content: string; created_at: string; author_id?: string } = {
          content,
          created_at,
        };
        // Admins can change the author
        if (isAdmin && authorId !== post.author_id) {
          updateInput.author_id = authorId;
        }
        const result = await updateLogPost(post.id, updateInput);
        if (result.success) {
          toast.success("Post updated successfully");
          router.push("/dashboard/log");
        } else {
          toast.error(result.error || "An error occurred");
        }
      } else {
        const input: { content: string; author_id?: string; created_at: string } = {
          content,
          created_at,
        };
        // Only admins can set author for other users
        if (isAdmin && authorId !== currentUserId) {
          input.author_id = authorId;
        }

        const result = await createLogPost(input);
        if (result.success) {
          toast.success("Post created successfully");
          router.push("/dashboard/log");
        } else {
          toast.error(result.error || "An error occurred");
        }
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Author selector for admins */}
      {isAdmin && users && users.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="author">Author</Label>
          <Select value={authorId} onValueChange={setAuthorId}>
            <SelectTrigger id="author">
              <SelectValue placeholder="Select author" />
            </SelectTrigger>
            <SelectContent>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.full_name || user.email}
                  {user.id === currentUserId && " (you)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Date/Time picker */}
      <div className="space-y-2">
        <Label htmlFor="postDate">Date & Time</Label>
        <Input
          id="postDate"
          type="datetime-local"
          value={postDate}
          onChange={(e) => setPostDate(e.target.value)}
          className="w-auto"
        />
      </div>

      {/* Content editor */}
      <div className="space-y-2">
        <Label>Content *</Label>
        <LogContentEditor
          value={content}
          onChange={setContent}
          placeholder="Write your update about the water system..."
        />
      </div>

      {/* Images section (only for editing existing posts) */}
      {isEditing && (
        <div className="space-y-2">
          <Label>Images</Label>
          <LogPostImages
            logPostId={post.id}
            canEdit={isAdmin || post.author_id === currentUserId}
          />
        </div>
      )}

      {!isEditing && (
        <p className="text-sm text-slate-500">
          You can add images after creating the post.
        </p>
      )}

      {/* Form actions */}
      <div className="flex gap-4">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? isEditing
              ? "Saving..."
              : "Creating..."
            : isEditing
              ? "Save Changes"
              : "Create Post"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/dashboard/log")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
