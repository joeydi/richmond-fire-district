/**
 * Browser-only helpers for embedding remote images into a react-pdf document.
 *
 * Photos are stored at up to MAX_DIMENSION (2560px) and served over short-lived
 * signed URLs. Handing those URLs straight to react-pdf's <Image> would make the
 * render depend on network fetches that can expire mid-run, and would produce a
 * needlessly huge PDF. Instead we fetch and downscale each photo up front and
 * hand the document self-contained data URLs.
 */

const PDF_IMAGE_MAX_DIMENSION = 900;
const PDF_IMAGE_QUALITY = 0.75;
const FETCH_CONCURRENCY = 4;

/**
 * Fetches an image and re-encodes it as a downscaled JPEG data URL.
 *
 * Returns null on any failure so that a single unreadable photo cannot sink the
 * whole report.
 */
export async function fetchImageAsDataUrl(
  url: string,
  maxDim = PDF_IMAGE_MAX_DIMENSION
): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const blob = await response.blob();
    // createImageBitmap applies EXIF orientation, so phone photos are not sideways.
    const bitmap = await createImageBitmap(blob, {
      imageOrientation: "from-image",
    });

    try {
      const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));

      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      // JPEG has no alpha; paint white so transparent PNGs do not go black.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      return canvas.toDataURL("image/jpeg", PDF_IMAGE_QUALITY);
    } finally {
      bitmap.close();
    }
  } catch {
    return null;
  }
}

/**
 * Resolves every url to a data URL with bounded concurrency, reporting progress
 * as each one settles. Failed images are omitted from the returned map.
 */
export async function fetchImagesAsDataUrls(
  urls: string[],
  onProgress?: (completed: number, total: number) => void
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  const unique = [...new Set(urls)];
  let completed = 0;
  let cursor = 0;

  async function worker() {
    while (cursor < unique.length) {
      const url = unique[cursor++];
      const dataUrl = await fetchImageAsDataUrl(url);
      if (dataUrl) {
        results.set(url, dataUrl);
      }
      completed++;
      onProgress?.(completed, unique.length);
    }
  }

  const workers = Array.from(
    { length: Math.min(FETCH_CONCURRENCY, unique.length) },
    () => worker()
  );
  await Promise.all(workers);

  return results;
}
