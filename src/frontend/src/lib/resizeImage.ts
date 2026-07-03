/**
 * Canvas-based image resize utility.
 * Caps the longest edge at `maxEdge` (default 1600px) and re-encodes as a
 * JPEG Blob at the given `quality` (default 0.8). Preserves aspect ratio.
 * If the source is already within the cap, it is still re-encoded as JPEG
 * (no upscale) so callers always receive a normalized JPEG Blob.
 */

export interface ResizeOptions {
  maxEdge?: number;
  quality?: number;
}

export async function resizeImage(
  file: File,
  maxEdge = 1600,
  quality = 0.8,
): Promise<Blob> {
  if (!file.type.startsWith("image/")) {
    throw new Error(`Not an image file: ${file.type || "unknown type"}`);
  }

  const bitmap = await loadBitmap(file);
  const { width: srcW, height: srcH } = bitmap;

  const scale = Math.min(1, maxEdge / Math.max(srcW, srcH));
  const dstW = Math.max(1, Math.round(srcW * scale));
  const dstH = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = dstW;
  canvas.height = dstH;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context unavailable in this environment.");
  }
  // White background so transparent PNGs don't go black in JPEG.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, dstW, dstH);
  ctx.drawImage(bitmap, 0, 0, dstW, dstH);

  if ("close" in bitmap && typeof bitmap.close === "function") {
    try {
      bitmap.close();
    } catch {
      /* ignore */
    }
  }

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );

  if (!blob) {
    throw new Error("Failed to encode resized image as JPEG.");
  }
  return blob;
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  // Preferred path: createImageBitmap (no DOM reflow, off-main-thread decode).
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // Fall through to <img> + object URL for browsers/Safari edge cases.
    }
  }
  return loadImageElement(file);
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      // Revoke after decode completes; the bitmap is now in memory.
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not decode the selected image file."));
    };
    img.src = url;
  });
}
