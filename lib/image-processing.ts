/**
 * Client-side image processing for uploads.
 *
 * Phone photos routinely arrive as 8-12MB HEIC files, which the upload server
 * actions reject on both format and size. Downscaling and re-encoding to JPEG in
 * the browser turns almost all of those into valid uploads.
 */

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_DIMENSION = 2560;

/** Formats accepted by the upload server actions. */
export const ACCEPTED_UPLOAD_TYPES = ["image/jpeg", "image/png", "image/webp"];

const JPEG_QUALITY_STEPS = [0.85, 0.7, 0.55];

/** An error whose message is safe to show the user directly. */
export class ImageProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageProcessingError";
  }
}

export function formatSize(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function getErrorMessage(error: unknown) {
  if (error instanceof ImageProcessingError) {
    return error.message;
  }
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

/**
 * Several browsers report an empty `type` for HEIC files, so the extension has
 * to be checked as well.
 */
export function isLikelyHeic(file: File) {
  return (
    /^image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name || "")
  );
}

interface DecodedImage {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
}

async function decodeImage(file: File): Promise<DecodedImage> {
  // createImageBitmap applies EXIF orientation, which matters because phone
  // photos are stored rotated and would otherwise upload sideways.
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
      });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      };
    } catch {
      // Fall through to the <img> path below.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Image decode failed"));
      el.src = url;
    });

    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    };
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Canvas encoding failed")),
      "image/jpeg",
      quality
    );
  });
}

function withJpegExtension(name: string) {
  const base = (name || "image").replace(/\.[^./\\]+$/, "");
  return `${base || "image"}.jpg`;
}

/**
 * Resizes to at most MAX_DIMENSION on the longest edge and re-encodes as JPEG.
 *
 * Returns the original file untouched when it is already a small enough JPEG.
 * Throws ImageProcessingError with a user-facing message when the file cannot be
 * decoded (a HEIC outside Safari) or cannot be compressed under the size limit.
 */
export async function processImageForUpload(file: File): Promise<File> {
  const heic = isLikelyHeic(file);

  if (!file.type.startsWith("image/") && !heic) {
    throw new ImageProcessingError(
      "That file isn't an image. Please choose a photo."
    );
  }

  if (file.size === 0) {
    throw new ImageProcessingError(
      "That file is empty. Please choose a different image."
    );
  }

  let decoded: DecodedImage;
  try {
    decoded = await decodeImage(file);
  } catch {
    // Only Safari/macOS/iOS can decode HEIC natively.
    throw new ImageProcessingError(
      heic
        ? "This browser can't read HEIC photos. Convert the photo to JPEG and try again, or upload from an iPhone or Mac."
        : "That image couldn't be read. It may be corrupted or in an unsupported format."
    );
  }

  try {
    const { width, height } = decoded;

    if (!width || !height) {
      throw new ImageProcessingError(
        "That image couldn't be read. It may be corrupted or in an unsupported format."
      );
    }

    const needsResize = Math.max(width, height) > MAX_DIMENSION;

    // Already a small enough JPEG: skip the re-encode and its generation loss.
    if (!needsResize && file.type === "image/jpeg" && file.size <= MAX_UPLOAD_BYTES) {
      return file;
    }

    const scale = needsResize ? MAX_DIMENSION / Math.max(width, height) : 1;
    const targetWidth = Math.round(width * scale);
    const targetHeight = Math.round(height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new ImageProcessingError(
        "Could not process the image in this browser."
      );
    }

    // JPEG has no alpha channel; without a white base, transparent areas of a
    // PNG render black.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(decoded.source, 0, 0, targetWidth, targetHeight);

    let blob: Blob | null = null;
    for (const quality of JPEG_QUALITY_STEPS) {
      blob = await canvasToBlob(canvas, quality);
      if (blob.size <= MAX_UPLOAD_BYTES) {
        break;
      }
    }

    if (!blob || blob.size > MAX_UPLOAD_BYTES) {
      throw new ImageProcessingError(
        `This image is still ${formatSize(
          blob?.size ?? file.size
        )} after compression. Maximum size is 5MB.`
      );
    }

    return new File([blob], withJpegExtension(file.name), {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } finally {
    decoded.release();
  }
}
