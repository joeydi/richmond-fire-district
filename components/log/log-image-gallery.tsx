"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Trash2, Loader2, ImageOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { deleteLogPostImage } from "@/lib/actions/log";
import type { LogPostImage } from "@/lib/types/log";
import { DeleteConfirmDialog } from "@/components/map/delete-confirm-dialog";

interface LogImageGalleryProps {
  images: LogPostImage[];
  canEdit?: boolean;
  onImageDeleted?: () => void;
}

export function LogImageGallery({
  images,
  canEdit = false,
  onImageDeleted,
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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
        {images.map((image) => (
          <div
            key={image.id}
            className="relative group aspect-square rounded-lg overflow-hidden bg-slate-100 cursor-pointer"
            onClick={() => setSelectedImage(image)}
          >
            {image.url ? (
              <Image
                src={image.url}
                alt={image.filename}
                fill
                className="object-cover transition-transform group-hover:scale-105"
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <ImageOff className="h-8 w-8 text-slate-300" />
              </div>
            )}

            {canEdit && (
              <Button
                size="icon"
                variant="destructive"
                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => handleDeleteClick(e, image)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
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
