"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Trash2, ImageOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { deleteLogPostImage } from "@/lib/actions/log";
import type { LogPostImage } from "@/lib/types/log";
import { DeleteConfirmDialog } from "@/components/map/delete-confirm-dialog";

interface LogImageGalleryProps {
  images: LogPostImage[];
  canEdit?: boolean;
  onImageDeleted?: () => void;
  /** compact: a row of small fixed-size thumbnails with a count, for feeds */
  variant?: "grid" | "compact";
}

export function LogImageGallery({
  images,
  canEdit = false,
  onImageDeleted,
  variant = "grid",
}: LogImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<LogPostImage | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<LogPostImage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = useCallback(
    (e: React.MouseEvent, image: LogPostImage) => {
      e.stopPropagation();
      setImageToDelete(image);
      setDeleteDialogOpen(true);
    },
    []
  );

  // Handle escape key for lightbox
  useEffect(() => {
    if (!selectedImage) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        setSelectedImage(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [selectedImage]);

  const handleConfirmDelete = useCallback(async () => {
    if (!imageToDelete) return;

    setIsDeleting(true);
    try {
      const result = await deleteLogPostImage(imageToDelete.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Image deleted successfully");
        onImageDeleted?.();
      }
    } catch {
      toast.error("Failed to delete image");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setImageToDelete(null);
    }
  }, [imageToDelete, onImageDeleted]);

  if (images.length === 0) {
    return null;
  }

  return (
    <>
      <div
        className={cn(
          variant === "compact"
            ? "flex flex-wrap items-center gap-1"
            : "grid grid-cols-3 gap-1.5"
        )}
      >
        {images.map((image) => (
          <div
            key={image.id}
            className={cn(
              "relative group overflow-hidden bg-zinc-100 cursor-pointer",
              variant === "compact"
                ? "size-16 rounded-sm border border-zinc-200"
                : "aspect-square rounded-md border"
            )}
            onClick={() => setSelectedImage(image)}
          >
            {image.url ? (
              <Image
                src={image.url}
                alt={image.filename}
                fill
                className="object-cover transition-transform group-hover:scale-105"
                sizes={
                  variant === "compact"
                    ? "64px"
                    : "(max-width: 1024px) 33vw, 96px"
                }
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <ImageOff className="size-5 text-zinc-300" />
              </div>
            )}

            {canEdit && (
              <button
                type="button"
                className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-sm bg-zinc-900/70 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-600 focus-visible:opacity-100 max-lg:opacity-100"
                onClick={(e) => handleDeleteClick(e, image)}
                title="Delete photo"
              >
                <Trash2 className="size-3" />
                <span className="sr-only">Delete {image.filename}</span>
              </button>
            )}
          </div>
        ))}
        {variant === "compact" && (
          <span className="ml-1.5 font-mono text-[11px] text-muted-foreground uppercase">
            {images.length} {images.length === 1 ? "photo" : "photos"}
          </span>
        )}
      </div>

      {/* Lightbox - rendered via portal to escape any stacking context */}
      {selectedImage &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90"
            onClick={() => setSelectedImage(null)}
          >
            <Button
              size="icon"
              variant="ghost"
              className="absolute top-4 right-4 text-white hover:bg-white/20 z-10"
              onClick={() => setSelectedImage(null)}
            >
              <X className="h-6 w-6" />
            </Button>

            <div className="relative w-full h-full flex items-center justify-center p-4">
              {selectedImage.url && (
                <Image
                  src={selectedImage.url}
                  alt={selectedImage.filename}
                  fill
                  className="object-contain"
                  onClick={(e) => e.stopPropagation()}
                />
              )}
            </div>
          </div>,
          document.body
        )}

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Image"
        description={`Are you sure you want to delete "${imageToDelete?.filename}"? This action cannot be undone.`}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </>
  );
}
