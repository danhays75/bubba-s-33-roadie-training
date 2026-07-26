/**
 * Canvas-based square crop utility for the CropPhotoModal.
 *
 * Takes a loaded image source (HTMLImageElement or ImageBitmap) plus a
 * react-easy-crop pixel crop area ({ x, y, width, height }) and produces a
 * cropped JPEG Blob. The crop is drawn at the crop area's natural pixel
 * dimensions (no upscale), then re-encoded as JPEG at the given quality.
 *
 * This is intentionally separate from resizeImage.ts: CropPhotoModal produces
 * the cropped Blob here, and the caller can then pass that Blob through the
 * existing resizeImage() (which caps the longest edge and re-encodes) before
 * uploading via usePhotoUpload. Keeping crop and resize as distinct steps
 * matches the existing flow and avoids coupling the two concerns.
 */

export interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CropImageOptions {
  /** JPEG re-encode quality (0–1). Defaults to 0.9 for the crop step. */
  quality?: number;
}

export type CropImageSource = HTMLImageElement | ImageBitmap;

/**
 * Draws the cropped region from `source` onto a fresh canvas sized to the
 * crop area and returns a JPEG Blob. Throws if the canvas context is
 * unavailable or encoding fails.
 */
export async function cropImage(
  source: CropImageSource,
  crop: PixelCrop,
  options: CropImageOptions = {},
): Promise<Blob> {
  const { quality = 0.9 } = options;

  const cropW = Math.max(1, Math.round(crop.width));
  const cropH = Math.max(1, Math.round(crop.height));

  const canvas = document.createElement("canvas");
  canvas.width = cropW;
  canvas.height = cropH;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context unavailable in this environment.");
  }

  // White background so transparent PNGs don't go black in JPEG.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, cropW, cropH);

  ctx.drawImage(
    source,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    cropW,
    cropH,
  );

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );

  if (!blob) {
    throw new Error("Failed to encode cropped image as JPEG.");
  }
  return blob;
}

/**
 * Loads an image source URL (object URL or remote URL) into an
 * HTMLImageElement suitable for cropping. Returns a cleanup function that
 * should be called when the caller is done with the image (it does NOT
 * revoke the URL — the caller owns the URL lifecycle, since CropPhotoModal
 * may pass a long-lived object URL it manages itself).
 */
export function loadImageForCrop(
  src: string,
): Promise<{ image: HTMLImageElement; cleanup: () => void }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    // Allow cross-origin images so the canvas isn't tainted (and toBlob works).
    img.crossOrigin = "anonymous";
    img.onload = () => {
      resolve({
        image: img,
        cleanup: () => {
          /* caller owns URL lifecycle */
        },
      });
    };
    img.onerror = () => {
      reject(new Error("Could not load the selected image for cropping."));
    };
    img.src = src;
  });
}
