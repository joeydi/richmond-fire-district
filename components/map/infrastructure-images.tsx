"use client";

import { useState, useCallback } from "react";
import { ImageUpload } from "./image-upload";
import { ImageGallery } from "./image-gallery";

interface InfrastructureImagesProps {
  infrastructurePointId: string;
  isAdmin?: boolean;
}

export function InfrastructureImages({
  infrastructurePointId,
  isAdmin = false,
}: InfrastructureImagesProps) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadComplete = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  return (
    <div className="space-y-4">
      <ImageGallery
        infrastructurePointId={infrastructurePointId}
        isAdmin={isAdmin}
        refreshTrigger={refreshTrigger}
      />

      {isAdmin && (
        <ImageUpload
          infrastructurePointId={infrastructurePointId}
          onUploadComplete={handleUploadComplete}
        />
      )}
    </div>
  );
}
