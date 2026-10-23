"use client";

import { useState, useCallback, useEffect } from "react";
import { LogImageUpload } from "./log-image-upload";
import { LogImageGallery } from "./log-image-gallery";
import { getLogPostImages } from "@/lib/actions/log";
import type { LogPostImage } from "@/lib/types/log";
import { Loader2 } from "lucide-react";

interface LogPostImagesProps {
  logPostId: string;
  canEdit?: boolean;
}

export function LogPostImages({ logPostId, canEdit = false }: LogPostImagesProps) {
  const [images, setImages] = useState<LogPostImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchImages = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedImages = await getLogPostImages(logPostId);
      setImages(fetchedImages);
    } catch (error) {
      console.error("Error fetching images:", error);
      setImages([]);
    } finally {
      setIsLoading(false);
    }
  }, [logPostId]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const handleUploadComplete = useCallback(() => {
    fetchImages();
  }, [fetchImages]);

  const handleImageDeleted = useCallback(() => {
    fetchImages();
  }, [fetchImages]);

  if (isLoading) {
    return (
      <div className="flex h-16 items-center justify-center">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {images.length > 0 && (
        <LogImageGallery
          images={images}
          canEdit={canEdit}
          onImageDeleted={handleImageDeleted}
        />
      )}

      {canEdit && (
        <LogImageUpload
          logPostId={logPostId}
          onUploadComplete={handleUploadComplete}
        />
      )}
    </div>
  );
}
