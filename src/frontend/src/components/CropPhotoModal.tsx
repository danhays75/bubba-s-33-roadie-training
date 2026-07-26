"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { type PixelCrop, cropImage, loadImageForCrop } from "@/lib/cropImage";
import { cn } from "@/lib/utils";
import { Loader2, ZoomIn } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";

export interface CropPhotoModalProps {
  /** Object URL or remote URL of the image to crop. */
  imageSrc: string;
  /** Called with the cropped JPEG Blob when the user confirms. */
  onConfirm: (croppedBlob: Blob) => void;
  /** Called when the user cancels (Escape, overlay click, or Cancel button). */
  onCancel: () => void;
}

/**
 * Square photo-crop modal used by both the Profile page upload and the
 * admin user-photo edit. Presents the selected image in a square crop
 * frame with drag-to-reposition and a zoom slider. On confirm, produces a
 * cropped JPEG Blob via canvas (see lib/cropImage.ts) that the caller can
 * then pass through the existing resizeImage + usePhotoUpload flow.
 *
 * Styled with the existing dark roadhouse theme tokens (card surface,
 * border, primary red, muted-foreground) — no new tokens added. Uses the
 * shadcn Dialog, Slider, and Button primitives for accessibility (focus
 * trap, Escape, labelled controls).
 */
export function CropPhotoModal({
  imageSrc,
  onConfirm,
  onCancel,
}: CropPhotoModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<PixelCrop | null>(
    null,
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Pre-load the image so we can draw it to canvas on confirm without a
  // race. react-easy-crop loads its own copy for display; this one is for
  // the canvas crop step.
  useEffect(() => {
    let active = true;
    setLoadError(null);
    loadImageForCrop(imageSrc)
      .then(({ image, cleanup }) => {
        if (!active) {
          cleanup();
          return;
        }
        imageRef.current = image;
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(
          err instanceof Error ? err.message : "Could not load the image.",
        );
      });
    return () => {
      active = false;
    };
  }, [imageSrc]);

  const onCropComplete = (_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  };

  const handleConfirm = async () => {
    const image = imageRef.current;
    if (!image || !croppedAreaPixels) return;
    setIsProcessing(true);
    try {
      const blob = await cropImage(image, croppedAreaPixels);
      onConfirm(blob);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Could not crop the image.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !isProcessing) onCancel();
      }}
    >
      <DialogContent
        className="sm:max-w-md"
        showCloseButton={false}
        data-ocid="crop_photo_modal"
      >
        <DialogHeader>
          <DialogTitle data-ocid="crop_photo_modal.title">
            Crop photo
          </DialogTitle>
          <DialogDescription data-ocid="crop_photo_modal.description">
            Drag to reposition and use the slider to zoom. The crop is square —
            what you see in the frame is what gets saved.
          </DialogDescription>
        </DialogHeader>

        {/* Crop stage — square aspect, dark frame matching the photo-field
            surface so the crop reads as a continuation of the upload slot. */}
        <div
          className={cn(
            "relative aspect-square w-full overflow-hidden rounded-md",
            "bg-card border border-border",
          )}
          data-ocid="crop_photo_modal.stage"
        >
          {loadError ? (
            <div
              className="flex h-full w-full items-center justify-center px-4 text-center text-sm text-destructive"
              data-ocid="crop_photo_modal.error_state"
            >
              {loadError}
            </div>
          ) : (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              cropShape="rect"
              showGrid
              classes={{
                containerClassName: "bg-card",
                cropAreaClassName: "border-2 border-primary",
              }}
            />
          )}
        </div>

        {/* Zoom control — labelled for screen readers, primary range fill. */}
        <div className="flex items-center gap-3">
          <ZoomIn
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <Slider
            value={[zoom]}
            min={1}
            max={3}
            step={0.01}
            onValueChange={(values) => setZoom(values[0] ?? 1)}
            disabled={isProcessing || !!loadError}
            aria-label="Zoom"
            data-ocid="crop_photo_modal.zoom_slider"
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isProcessing}
            data-ocid="crop_photo_modal.cancel_button"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isProcessing || !!loadError || !croppedAreaPixels}
            data-ocid="crop_photo_modal.confirm_button"
          >
            {isProcessing ? (
              <>
                <Loader2 className="animate-spin" />
                Cropping…
              </>
            ) : (
              "Confirm"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CropPhotoModal;
