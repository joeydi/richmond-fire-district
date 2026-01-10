"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Trash2, Loader2, ImageOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  getInfrastructureImages,
  deleteInfrastructureImage,
} from "@/lib/actions/infrastructure";
import type { InfrastructureImage } from "@/lib/types/infrastructure";
import { DeleteConfirmDialog } from "./delete-confirm-dialog";

interface ImageGalleryProps {
  infrastructurePointId: string;
  isAdmin?: boolean;
  refreshTrigger?: number;
}

export function ImageGallery({
  infrastructurePointId,
  isAdmin = false,
  refreshTrigger = 0,
}: ImageGalleryProps) {
  const [images, setImages] = useState<InfrastructureImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<InfrastructureImage | null>(
    null
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<InfrastructureImage | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchImages = useCallback(async () => {
    setIsLoading(true);
    try {
      const images = await getInfrastructureImages(infrastructurePointId);
      setImages(images);
    } catch (error) {
      console.error("Error fetching images:", error);
      setImages([]);
    } finally {
      setIsLoading(false);
    }
  }, [infrastructurePointId]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages, refreshTrigger]);

  const handleDeleteClick = useCallback(
    (e: React.MouseEvent, image: InfrastructureImage) => {
      e.stopPropagation();
      setImageToDelete(image);
      setDeleteDialogOpen(true);
    },
    []
  );

  // Handle escape key for lightbox - must prevent modal from also closing
  useEffect(() => {
    if (!selectedImage) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        setSelectedImage(null);
      }
    };

    // Use capture phase with highest priority
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [selectedImage]);

  const handleConfirmDelete = useCallback(async () => {
    if (!imageToDelete) return;

    setIsDeleting(true);
    try {
      const result = await deleteInfrastructureImage(imageToDelete.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Image deleted successfully");
        fetchImages();
      }
    } catch {
      toast.error("Failed to delete image");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setImageToDelete(null);
    }
  }, [imageToDelete, fetchImages]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-slate-400">
        <ImageOff className="h-8 w-8 mb-2" />
        <p className="text-sm">No images uploaded</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                sizes="(max-width: 640px) 50vw, 33vw"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <ImageOff className="h-8 w-8 text-slate-300" />
              </div>
            )}

            {isAdmin && (
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

      {/* Lightbox - rendered via portal to escape modal stacking context */}
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
