"use client";

import { useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, RotateCcw } from "lucide-react";
import { useCamera } from "@/hooks/use-camera";

interface CameraCaptureProps {
  capturedImage: string | null;
  onCapture: (dataUrl: string, capturedAt: string) => void;
  onRequestRetake: () => void;
  onRequestClose: () => void;
}

export function CameraCapture({
  capturedImage,
  onCapture,
  onRequestRetake,
  onRequestClose,
}: CameraCaptureProps) {
  const { videoRef, isActive, error, startCamera, stopCamera } = useCamera({
    facingMode: "environment",
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Start camera on mount
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const handleCapture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    // Capture timestamp at the moment of capture
    const capturedAt = new Date().toISOString();

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    onCapture(canvas.toDataURL("image/jpeg", 0.8), capturedAt);
  }, [videoRef, onCapture]);

  if (error) {
    return (
      <div className="rounded-lg border bg-slate-50 p-4 text-center">
        <p className="text-slate-600 font-medium">Camera access required</p>
        <p className="text-sm text-slate-500 mt-1">
          {error.name === "NotAllowedError"
            ? "Please allow camera access in your browser settings."
            : "Could not access camera. Please try again."}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={onRequestClose}
        >
          Close
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative rounded-lg overflow-hidden bg-black">
        {/* Live preview (hidden, not unmounted, while showing a capture so the
            stream stays attached and retake is instant) */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={capturedImage ? "hidden" : "w-full aspect-[4/3] object-cover"}
        />

        {capturedImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={capturedImage}
            alt="Captured meter reading"
            className="w-full aspect-[4/3] object-cover"
          />
        )}

        {/* Loading overlay before camera starts */}
        {!isActive && !error && !capturedImage && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        )}

        {/* Hidden canvas for frame capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {capturedImage ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onRequestRetake}
        >
          <RotateCcw className="h-4 w-4" />
          Back to preview
        </Button>
      ) : (
        <Button
          type="button"
          size="sm"
          className="w-full"
          onClick={handleCapture}
          disabled={!isActive}
        >
          <Camera className="h-4 w-4" />
          Capture
        </Button>
      )}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-full"
        onClick={onRequestClose}
      >
        Done
      </Button>
    </div>
  );
}
