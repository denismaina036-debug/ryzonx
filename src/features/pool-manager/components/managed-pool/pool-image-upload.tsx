"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { POOL_IMAGE_MAX_BYTES } from "@/constants/storage";
import {
  DEFAULT_COVER_IMAGE_POSITION,
  type CoverImagePosition,
} from "@/domain/pools/cover-image-position";
import { CoverImagePositionPicker } from "@/features/pool-manager/components/managed-pool/cover-image-position-picker";
import { pmSecondaryButtonClass } from "@/features/pool-manager/constants/ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PoolImageUploadProps {
  imageUrl: string;
  coverImagePosition?: CoverImagePosition;
  poolId?: string;
  disabled?: boolean;
  onUploaded: (imageUrl: string) => void;
  onCoverImagePositionChange?: (position: CoverImagePosition) => void;
  onClear?: () => void;
}

export function PoolImageUpload({
  imageUrl,
  coverImagePosition = DEFAULT_COVER_IMAGE_POSITION,
  poolId,
  disabled,
  onUploaded,
  onCoverImagePositionChange,
  onClear,
}: PoolImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState(imageUrl);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setPreviewUrl(imageUrl);
  }, [imageUrl]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > POOL_IMAGE_MAX_BYTES) {
      toast.error("Image must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      event.target.value = "";
      return;
    }

    setUploading(true);
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    try {
      const formData = new FormData();
      formData.append("image", file);
      if (poolId) formData.append("poolId", poolId);

      const res = await fetch("/api/pool-manager/pools/image", {
        method: "POST",
        body: formData,
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Upload failed");

      setPreviewUrl(body.imageUrl as string);
      onUploaded(body.imageUrl as string);
      onCoverImagePositionChange?.({ ...DEFAULT_COVER_IMAGE_POSITION });
      toast.success("Pool image uploaded");
    } catch (err) {
      setPreviewUrl(imageUrl);
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      URL.revokeObjectURL(localPreview);
      setUploading(false);
      event.target.value = "";
    }
  }

  function handleClear() {
    setPreviewUrl("");
    onCoverImagePositionChange?.({ ...DEFAULT_COVER_IMAGE_POSITION });
    onClear?.();
    onUploaded("");
  }

  return (
    <div className="space-y-4">
      {!previewUrl ? (
        <div
          className={cn(
            "relative flex min-h-[10rem] items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[var(--id-border-strong)] bg-[var(--id-surface)]"
          )}
        >
          <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
            <ImagePlus className="h-8 w-8 text-[var(--id-text-muted)]" strokeWidth={1.5} />
            <p className="text-sm text-[var(--id-text-secondary)]">Upload a cover image for your pool card</p>
          </div>
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          )}
        </div>
      ) : onCoverImagePositionChange ? (
        <CoverImagePositionPicker
          imageUrl={previewUrl}
          position={coverImagePosition}
          disabled={disabled}
          onChange={onCoverImagePositionChange}
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={disabled || uploading}
          className={pmSecondaryButtonClass}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? "Uploading…" : previewUrl ? "Replace image" : "Upload image"}
        </Button>
        {previewUrl && !disabled && (
          <Button
            type="button"
            variant="outline"
            disabled={disabled || uploading}
            className={pmSecondaryButtonClass}
            onClick={handleClear}
          >
            Remove image
          </Button>
        )}
        <p className="text-xs text-[var(--id-text-muted)]">JPG, PNG, WebP, or GIF · Max 5 MB</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        className="hidden"
        disabled={disabled || uploading}
        onChange={handleFileChange}
      />
    </div>
  );
}
