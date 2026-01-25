"use client";

import { useRef, useState, useCallback } from "react";

interface UseCameraOptions {
  facingMode?: "user" | "environment";
  width?: number;
  height?: number;
}

interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isActive: boolean;
  error: Error | null;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
}

export function useCamera(options: UseCameraOptions = {}): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: options.facingMode ?? "environment",
          width: { ideal: options.width ?? 1920 },
          height: { ideal: options.height ?? 1080 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsActive(true);
      }
    } catch (err) {
      setError(err as Error);
      setIsActive(false);
    }
  }, [options.facingMode, options.width, options.height]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
  }, []);

  return { videoRef, isActive, error, startCamera, stopCamera };
}
