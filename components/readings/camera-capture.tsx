"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useCamera } from "@/hooks/use-camera";
import { extractMeterReading } from "@/lib/actions/ocr";

interface CameraCaptureProps {
  onReadingDetected: (reading: string, capturedAt: string) => void;
  onClose: () => void;
}

export function CameraCapture({
  onReadingDetected,
  onClose,
}: CameraCaptureProps) {
  const { videoRef, isActive, error, startCamera, stopCamera } = useCamera({
    facingMode: "environment",
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastReading, setLastReading] = useState<string | null>(null);

  // Start camera on mount
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  // Capture and process frame every 1 second
  useEffect(() => {
    if (!isActive) return;

    const processFrame = async () => {
      if (isProcessing || !videoRef.current || !canvasRef.current) return;

      setIsProcessing(true);

      // Capture timestamp BEFORE API call (accurate reading time)
      const capturedAt = new Date().toISOString();

      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setIsProcessing(false);
        return;
      }

      ctx.drawImage(video, 0, 0);

      // Get base64 (strip data URL prefix)
      const base64 = canvas.toDataURL("image/jpeg", 0.8).split(",")[1];

      try {
        const result = await extractMeterReading(base64);
        if (result.reading) {
          setLastReading(result.reading);
          onReadingDetected(result.reading, capturedAt);
        }
      } catch (err) {
        console.error("OCR error:", err);
      } finally {
        setIsProcessing(false);
      }
    };

    const interval = setInterval(processFrame, 1000);
    return () => clearInterval(interval);
  }, [isActive, isProcessing, onReadingDetected, videoRef]);

  const handleClose = useCallback(() => {
    stopCamera();
    onClose();
  }, [stopCamera, onClose]);

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
          onClick={onClose}
        >
          Close
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative rounded-lg overflow-hidden bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full aspect-[4/3] object-cover"
        />

        {/* ROI Overlay - dashed cyan rectangle */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute border-2 border-dashed border-blue-500 rounded-lg"
            style={{ left: "10%", right: "10%", top: "35%", bottom: "35%" }}
          />
        </div>

        {/* Loading overlay before camera starts */}
        {!isActive && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        )}

        {/* Processing indicator */}
        {isProcessing && (
          <div className="absolute top-2 right-2 bg-black/50 rounded px-2 py-1">
            <span className="text-white text-xs">Reading...</span>
          </div>
        )}

        {/* Last detected reading */}
        {lastReading && (
          <div className="absolute bottom-2 left-2 right-2 bg-black/70 rounded p-2 text-center">
            <span className="text-white font-mono text-lg">{lastReading}</span>
          </div>
        )}

        {/* Hidden canvas for frame capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={handleClose}
      >
        Done
      </Button>
    </div>
  );
}
