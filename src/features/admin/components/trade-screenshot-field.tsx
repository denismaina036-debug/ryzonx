"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { ImagePlus, Link2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  TRADE_SCREENSHOT_MAX_BYTES,
  isAllowedScreenshotMime,
} from "@/lib/storage/trade-screenshots";

interface TradeScreenshotFieldProps {
  url: string;
  onUrlChange: (url: string) => void;
  file: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
  compact?: boolean;
}

function formatMaxSize(): string {
  return `${Math.round(TRADE_SCREENSHOT_MAX_BYTES / (1024 * 1024))} MB`;
}

export function TradeScreenshotField({
  url,
  onUrlChange,
  file,
  onFileChange,
  disabled = false,
  compact = false,
}: TradeScreenshotFieldProps) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const displayPreview = previewUrl ?? (url.trim() || null);

  function handleFileSelect(selected: File | null) {
    if (!selected) {
      onFileChange(null);
      return;
    }

    if (!isAllowedScreenshotMime(selected.type)) {
      toast.error("Use a JPEG, PNG, WebP, or GIF image.");
      return;
    }

    if (selected.size > TRADE_SCREENSHOT_MAX_BYTES) {
      toast.error(`Image must be ${formatMaxSize()} or smaller.`);
      return;
    }

    onFileChange(selected);
    onUrlChange("");
  }

  function onFileInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    handleFileSelect(selected);
    event.target.value = "";
  }

  function clearFile() {
    onFileChange(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className={cn("space-y-3", compact && "space-y-2")}>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInputRef}
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          disabled={disabled}
          onChange={onFileInputChange}
        />
        <Button
          type="button"
          variant="outline"
          size={compact ? "sm" : "default"}
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
        >
          <ImagePlus className="h-4 w-4" />
          Upload image
        </Button>
        {file ? (
          <Button
            type="button"
            variant="ghost"
            size={compact ? "sm" : "default"}
            disabled={disabled}
            onClick={clearFile}
          >
            <X className="h-4 w-4" />
            Remove file
          </Button>
        ) : null}
      </div>

      {file ? (
        <p className="text-xs text-navy-500">
          Selected: {file.name} ({(file.size / 1024).toFixed(0)} KB)
        </p>
      ) : null}

      <div>
        <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-navy-700">
          <Link2 className="h-3.5 w-3.5" />
          Or paste screenshot URL
        </label>
        <Input
          value={url}
          disabled={disabled || !!file}
          placeholder="https://www.tradingview.com/x/... or Supabase image URL"
          className={cn(compact && "h-8 text-xs")}
          onChange={(e) => {
            onUrlChange(e.target.value);
            if (e.target.value.trim()) onFileChange(null);
          }}
        />
        {file ? (
          <p className="mt-1 text-[11px] text-navy-500">
            Remove the uploaded file to use a URL instead.
          </p>
        ) : null}
      </div>

      {displayPreview ? (
        <div className="overflow-hidden rounded-lg border border-border bg-surface-1">
          <p className="border-b border-border px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-navy-500">
            Preview
          </p>
          <div className="relative aspect-[16/7] w-full">
            <Image
              src={displayPreview}
              alt="Trade screenshot preview"
              fill
              className="object-cover object-top"
              sizes="400px"
              unoptimized
            />
          </div>
        </div>
      ) : null}

      <p className="text-[11px] text-navy-500">
        JPEG, PNG, WebP, or GIF up to {formatMaxSize()}. TradingView share links work as URLs.
      </p>
    </div>
  );
}
