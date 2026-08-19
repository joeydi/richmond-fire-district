"use client";

import { useRef, useState, useCallback } from "react";
import { Upload, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { uploadLogPostImage } from "@/lib/actions/log";
import { getErrorMessage, processImageForUpload } from "@/lib/image-processing";

interface LogImageUploadProps {
  logPostId: string;
  onUploadComplete?: () => void;
  disabled?: boolean;
}

export function LogImageUpload({
  logPostId,
  onUploadComplete,
  disabled = false,
}: LogImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
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

      // Resize and convert to JPEG so oversized and HEIC photos still upload.
      let prepared: File;
      setIsProcessing(true);
      try {
        prepared = await processImageForUpload(file);
      } catch (err) {
        console.error("Error processing image:", err);
        fail(getErrorMessage(err));
        return;
      } finally {
        setIsProcessing(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }

      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", prepared);

        const result = await uploadLogPostImage(logPostId, formData);

        if (result.error) {
          fail(result.error);
        } else {
          setLastFile(null);
          toast.success("Image uploaded successfully");
          onUploadComplete?.();
        }
      } catch (err) {
        console.error("Error uploading log post image:", err);
        fail(getErrorMessage(err));
      } finally {
        setIsUploading(false);
      }
    },
    [logPostId, onUploadComplete, fail]
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

  const isBusy = isProcessing || isUploading;

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${
        dragActive
          ? "border-blue-500 bg-blue-50"
          : "border-slate-300 hover:border-slate-400"
      } ${disabled || isBusy ? "opacity-50 cursor-not-allowed" : ""}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
        onChange={handleFileSelect}
        disabled={disabled || isBusy}
        className="hidden"
      />

      <div className="flex flex-col items-center justify-center gap-2 text-center">
        {isBusy ? (
          <>
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            <p className="text-sm text-slate-600">
              {isProcessing ? "Preparing image..." : "Uploading..."}
            </p>
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
              JPEG, PNG, WebP, or HEIC — large photos are resized automatically
            </p>
          </>
        )}

        {error && !isBusy && (
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
