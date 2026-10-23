"use client";

import { useRef, useState, useCallback } from "react";
import { ImagePlus, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
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
          toast.success("Photo added");
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

  /** Uploads one at a time so each gets its own progress and error */
  const handleFiles = useCallback(
    async (files: File[]) => {
      for (const file of files) {
        await handleUpload(file);
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

  const isBusy = isProcessing || isUploading;

  return (
    <div className="flex flex-col gap-1.5">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          handleFiles(files);
        }}
        disabled={disabled || isBusy}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || isBusy}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={(e) => {
          handleDrag(e);
          setDragActive(false);
          handleFiles(Array.from(e.dataTransfer.files));
        }}
        className={cn(
          "flex h-16 flex-col items-center justify-center gap-1 rounded-md border border-dashed text-xs text-muted-foreground transition-colors hover:border-zinc-400 hover:text-foreground disabled:cursor-not-allowed",
          dragActive && "border-brand bg-brand/5 text-foreground"
        )}
      >
        {isBusy ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            <span className="font-mono text-[10px] tracking-[0.04em]">
              {isProcessing ? "PREPARING…" : "UPLOADING…"}
            </span>
          </>
        ) : (
          <>
            <ImagePlus className="size-4" strokeWidth={1.75} />
            Add photos
          </>
        )}
      </button>

      {error && !isBusy && (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-2 py-1.5">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-red-600" />
          <div className="flex flex-1 flex-col gap-0.5">
            <p className="text-xs text-red-700">{error}</p>
            {lastFile && (
              <button
                type="button"
                onClick={handleRetry}
                disabled={disabled}
                className="self-start text-xs font-medium text-red-700 underline hover:text-red-800"
              >
                Try again
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
