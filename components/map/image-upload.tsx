"use client";

import { useRef, useState, useCallback } from "react";
import { Upload, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { uploadInfrastructureImage } from "@/lib/actions/infrastructure";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

function formatSize(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function getErrorMessage(error: unknown) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return "You appear to be offline. Check your connection and try again.";
  }
  if (error instanceof Error) {
    // Server Actions surface network/transport failures as a generic TypeError
    if (error.name === "TypeError") {
      return "Could not reach the server. Check your connection and try again.";
    }
    return error.message;
  }
  return "Failed to upload image. Please try again.";
}

interface ImageUploadProps {
  infrastructurePointId: string;
  onUploadComplete?: () => void;
  disabled?: boolean;
}

export function ImageUpload({
  infrastructurePointId,
  onUploadComplete,
  disabled = false,
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFile, setLastFile] = useState<File | null>(null);

  const fail = useCallback((message: string) => {
    setError(message);
    toast.error(message);
  }, []);

  const handleUpload = useCallback(
    async (file: File) => {
      setError(null);
      setLastFile(file);

      if (!ACCEPTED_TYPES.includes(file.type)) {
        fail(
          file.type.startsWith("image/")
            ? "Unsupported image format. Use JPEG, PNG, or WebP."
            : "That file isn't an image. Use JPEG, PNG, or WebP."
        );
        return;
      }

      if (file.size === 0) {
        fail("That file is empty. Please choose a different image.");
        return;
      }

      if (file.size > MAX_SIZE_BYTES) {
        fail(`Image is ${formatSize(file.size)}. Maximum size is 5MB.`);
        return;
      }

      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);

        const result = await uploadInfrastructureImage(
          infrastructurePointId,
          formData
        );

        if (result.error) {
          fail(result.error);
        } else {
          setLastFile(null);
          toast.success("Image uploaded successfully");
          onUploadComplete?.();
        }
      } catch (err) {
        console.error("Error uploading infrastructure image:", err);
        fail(getErrorMessage(err));
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [infrastructurePointId, onUploadComplete, fail]
  );

  const handleRetry = useCallback(() => {
    if (lastFile) {
      handleUpload(lastFile);
    }
  }, [lastFile, handleUpload]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleUpload(file);
      }
    },
    [handleUpload]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const file = e.dataTransfer.files?.[0];
      if (file) {
        handleUpload(file);
      }
    },
    [handleUpload]
  );

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${
        dragActive
          ? "border-blue-500 bg-blue-50"
          : "border-slate-300 hover:border-slate-400"
      } ${disabled || isUploading ? "opacity-50 cursor-not-allowed" : ""}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        disabled={disabled || isUploading}
        className="hidden"
      />

      <div className="flex flex-col items-center justify-center gap-2 text-center">
        {isUploading ? (
          <>
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            <p className="text-sm text-slate-600">Uploading...</p>
          </>
        ) : (
          <>
            <Upload className="h-8 w-8 text-slate-400" />
            <p className="text-sm text-slate-600">
              Drag and drop an image, or{" "}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                browse
              </button>
            </p>
            <p className="text-xs text-slate-400">
              JPEG, PNG, or WebP (max 5MB)
            </p>
          </>
        )}

        {error && !isUploading && (
          <div
            role="alert"
            className="mt-2 flex w-full items-start gap-2 rounded-md border border-red-200 bg-red-50 p-2 text-left"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            <div className="flex-1 space-y-1">
              <p className="text-xs text-red-700">{error}</p>
              {lastFile && (
                <button
                  type="button"
                  onClick={handleRetry}
                  disabled={disabled}
                  className="text-xs font-medium text-red-700 underline hover:text-red-800"
                >
                  Try again
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
