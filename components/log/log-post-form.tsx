"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getErrorMessage, isLikelyHeic, processImageForUpload } from "@/lib/image-processing";
import { LogContentEditor } from "./mdx-editor-wrapper";
import { LogPostImages } from "./log-post-images";
import { fromDistrictInputValue, toDistrictInputValue } from "./log-dates";
import { createLogPost, updateLogPost, uploadLogPostImage } from "@/lib/actions/log";
import type { LogPostWithImages } from "@/lib/types/log";
import type { Profile } from "@/lib/types/database";

const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif";

const labelClass = "font-mono text-[10px] font-normal tracking-[0.08em] text-muted-foreground uppercase";

interface LogPostFormProps {
  post?: LogPostWithImages;
  users?: Profile[];
  isAdmin?: boolean;
  currentUserId: string;
  /** Shown as the author when the author can't be changed */
  currentUserName: string;
  onClose: () => void;
  /** Called with the saved post's id; `retryPhotos` when some queued photos didn't upload */
  onSaved: (id: string, options?: { retryPhotos?: boolean }) => void;
}

interface PendingPhoto {
  key: string;
  file: File;
  /** Object URL for the thumbnail; HEIC has none since browsers can't show it */
  preview: string | null;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

function isPopoverOpen(): boolean {
  return !!document.querySelector(
    '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [role="menu"], [role="listbox"]'
  );
}

function nowInputValue() {
  return toDistrictInputValue(new Date().toISOString());
}

/** Photos picked before the post exists; uploaded right after it's created */
function PendingPhotos({
  photos,
  onAdd,
  onRemove,
  disabled,
}: {
  photos: PendingPhoto[];
  onAdd: (files: File[]) => void;
  onRemove: (key: string) => void;
  disabled: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      {photos.length > 0 && (
        <ul className="grid grid-cols-3 gap-1.5">
          {photos.map((photo) => (
            <li key={photo.key} className="group relative aspect-square overflow-hidden rounded-md border bg-zinc-50">
              {photo.preview ? (
                // eslint-disable-next-line @next/next/no-img-element -- local object URL
                <img src={photo.preview} alt={photo.file.name} className="size-full object-cover" />
              ) : (
                <span className="flex size-full items-center justify-center p-1.5 text-center font-mono text-[10px] break-all text-muted-foreground">
                  {photo.file.name}
                </span>
              )}
              <button
                type="button"
                onClick={() => onRemove(photo.key)}
                disabled={disabled}
                className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-sm bg-zinc-900/70 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 max-lg:opacity-100"
              >
                <X className="size-3" />
                <span className="sr-only">Remove {photo.file.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          onAdd(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          onAdd(Array.from(e.dataTransfer.files));
        }}
        className={cn(
          "flex h-16 flex-col items-center justify-center gap-1 rounded-md border border-dashed text-xs text-muted-foreground transition-colors hover:border-zinc-400 hover:text-foreground disabled:opacity-50",
          dragActive && "border-brand bg-brand/5 text-foreground"
        )}
      >
        <ImagePlus className="size-4" strokeWidth={1.75} />
        Add photos
      </button>
    </div>
  );
}

/** Composer for new and edited log posts, shown in the log page's side sheet */
export function LogPostForm({
  post,
  users,
  isAdmin = false,
  currentUserId,
  currentUserName,
  onClose,
  onSaved,
}: LogPostFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);
  const isEditing = !!post;

  const initialDate = post ? toDistrictInputValue(post.created_at) : null;
  const initialAuthor = post?.author_id ?? currentUserId;
  const [content, setContent] = useState(post?.content ?? "");
  const [authorId, setAuthorId] = useState(initialAuthor);
  const [postDate, setPostDate] = useState(() => initialDate ?? nowInputValue());
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);

  const isDirty = isEditing
    ? content !== post.content || postDate !== initialDate || authorId !== initialAuthor
    : content.trim() !== "" || photos.length > 0;
  const authorOptions = isAdmin ? (users ?? []) : [];
  const canChangeAuthor = authorOptions.length > 0;

  // Warn before closing the tab on unsaved work
  useEffect(() => {
    if (!isDirty || isPending) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty, isPending]);

  // Revoke thumbnails when they're removed or the form unmounts
  const previews = useRef(new Set<string>());
  useEffect(() => {
    const current = new Set(photos.flatMap((p) => (p.preview ? [p.preview] : [])));
    previews.current.forEach((url) => {
      if (!current.has(url)) URL.revokeObjectURL(url);
    });
    previews.current = current;
  }, [photos]);
  useEffect(() => () => previews.current.forEach((url) => URL.revokeObjectURL(url)), []);

  const addPhotos = (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith("image/") || isLikelyHeic(f));
    if (images.length < files.length) toast.error("Only image files can be added");
    setPhotos((current) => [
      ...current,
      ...images.map((file) => ({
        key: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
        file,
        preview: isLikelyHeic(file) ? null : URL.createObjectURL(file),
      })),
    ]);
  };

  const cancel = () => {
    if (isDirty && !window.confirm("Discard your changes to this post?")) return;
    onClose();
  };

  /** Uploads queued photos to a new post; returns how many failed */
  const uploadPhotos = async (postId: string) => {
    let failed = 0;
    for (const [i, photo] of photos.entries()) {
      setStatus(`UPLOADING PHOTO ${i + 1} OF ${photos.length}…`);
      try {
        const formData = new FormData();
        formData.append("file", await processImageForUpload(photo.file));
        const result = await uploadLogPostImage(postId, formData);
        if (result.error) throw new Error(result.error);
      } catch (err) {
        failed++;
        toast.error(`${photo.file.name}: ${getErrorMessage(err)}`);
      }
    }
    return failed;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending || (isEditing && !isDirty)) return;
    if (!content.trim()) {
      toast.error("Write something before posting");
      return;
    }

    startTransition(async () => {
      // An untouched date keeps the original timestamp, seconds and all
      const created_at = isEditing && postDate === initialDate ? post.created_at : fromDistrictInputValue(postDate);
      const author_id = canChangeAuthor && authorId !== initialAuthor ? authorId : undefined;

      if (isEditing) {
        setStatus("SAVING…");
        const result = await updateLogPost(post.id, {
          content,
          created_at,
          author_id,
        });
        setStatus(null);
        if (!result.success) {
          toast.error(result.error || "Could not save post");
          return;
        }
        toast.success("Post updated");
        onSaved(post.id);
        return;
      }

      setStatus("POSTING…");
      const result = await createLogPost({ content, created_at, author_id });
      if (!result.success || !result.id) {
        setStatus(null);
        toast.error(result.error || "Could not create post");
        return;
      }
      const failed = await uploadPhotos(result.id);
      setStatus(null);
      if (failed > 0) {
        // The post exists; reopen it so the photos can be retried
        toast.warning(`Posted, but ${failed} ${failed === 1 ? "photo" : "photos"} didn't upload`);
        onSaved(result.id, { retryPhotos: true });
        return;
      }
      toast.success("Posted");
      onSaved(result.id);
    });
  };

  // ⌘↵ / Ctrl+↵ submits from anywhere in the composer, including the editor
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        formRef.current?.requestSubmit();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Esc closes the sheet, unless it's meant for a field, menu or dialog
  const cancelRef = useRef(cancel);
  useEffect(() => {
    cancelRef.current = cancel;
  });
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || isTypingTarget(e.target) || isPopoverOpen()) return;
      cancelRef.current();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const submitLabel = isEditing ? "Save changes" : "Post";
  const label = status ?? (isEditing ? "EDITING POST" : "NEW POST");

  const submitButton = (
    <Button
      type="submit"
      size="sm"
      className="h-7 px-2.5 text-xs"
      disabled={isPending || (isEditing ? !isDirty : !content.trim())}
    >
      {isPending ? (isEditing ? "Saving…" : "Posting…") : submitLabel}
    </Button>
  );
  const cancelButton = (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 px-2.5 text-xs"
      onClick={cancel}
      disabled={isPending}
    >
      Cancel
    </Button>
  );
  const shortcutHint = (
    <span className="hidden font-mono text-[10px] text-muted-foreground sm:inline">
      ⌘↵ TO {isEditing ? "SAVE" : "POST"}
    </span>
  );

  const details = (
    <>
      <div className="flex flex-col gap-1.5 px-4 py-3">
        <div className="flex items-center">
          <Label htmlFor="post-date" className={cn(labelClass, "flex-1")}>
            Date &amp; time
          </Label>
          <button
            type="button"
            onClick={() => setPostDate(nowInputValue())}
            className="font-mono text-[10px] tracking-[0.04em] text-muted-foreground hover:text-foreground"
          >
            NOW
          </button>
        </div>
        <Input
          id="post-date"
          type="datetime-local"
          required
          value={postDate}
          onChange={(e) => setPostDate(e.target.value)}
          className="h-8 font-mono text-[13px]"
        />
        <p className="text-xs text-muted-foreground">Eastern time. Backdate to log something that already happened.</p>
      </div>

      <div className="flex flex-col gap-1.5 border-t border-zinc-100 px-4 py-3">
        <Label htmlFor="post-author" className={labelClass}>
          Author
        </Label>
        {canChangeAuthor ? (
          <Select value={authorId} onValueChange={setAuthorId}>
            <SelectTrigger id="post-author" size="sm" className="!h-8 w-full px-2 text-[13px]">
              <SelectValue placeholder="Select author" />
            </SelectTrigger>
            <SelectContent>
              {authorOptions.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.full_name || user.email}
                  {user.id === currentUserId && <span className="text-muted-foreground"> (you)</span>}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p id="post-author" className="text-[13px]">
            {post?.author?.full_name || post?.author?.email || currentUserName}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-zinc-100 px-4 py-3">
        <span className={labelClass}>Photos</span>
        {isEditing ? (
          <LogPostImages logPostId={post.id} canEdit />
        ) : (
          <PendingPhotos
            photos={photos}
            onAdd={addPhotos}
            onRemove={(key) => setPhotos((current) => current.filter((p) => p.key !== key))}
            disabled={isPending}
          />
        )}
        {isEditing && <p className="text-xs text-muted-foreground">Photos save as soon as they upload.</p>}
      </div>
    </>
  );

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      aria-label={isEditing ? "Edit post" : "New post"}
      className="flex h-full w-full flex-col bg-background"
    >
      <div className="flex h-11 shrink-0 items-center gap-1 border-b px-2 pl-4">
        <span className="flex-1 truncate font-mono text-[11px] tracking-[0.06em] text-muted-foreground">{label}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground"
          onClick={cancel}
          disabled={isPending}
          title="Close"
        >
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <LogContentEditor
          value={content}
          onChange={setContent}
          autoFocus={!isEditing}
          placeholder="What happened on the water system?"
          compact
          className="border-b"
        />
        {details}
      </div>

      <div className="flex shrink-0 items-center gap-2 border-t px-4 py-3">
        {submitButton}
        {cancelButton}
        <span className="flex-1" />
        {shortcutHint}
      </div>
    </form>
  );
}
