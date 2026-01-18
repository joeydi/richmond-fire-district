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
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
