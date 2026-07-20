"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Move, RotateCcw } from "lucide-react";
import {
  DEFAULT_COVER_IMAGE_POSITION,
  type CoverImagePosition,
  coverImagePositionCss,
} from "@/domain/pools/cover-image-position";
import { Button } from "@/components/ui/button";
import { pmSecondaryButtonClass } from "@/features/pool-manager/constants/ui";
import { cn } from "@/lib/utils";

const DRAG_SENSITIVITY = 0.18;

interface CoverImagePositionPickerProps {
  imageUrl: string;
  position: CoverImagePosition;
  disabled?: boolean;
  onChange: (position: CoverImagePosition) => void;
}

export function CoverImagePositionPicker({
  imageUrl,
  position,
  disabled,
  onChange,
}: CoverImagePositionPickerProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const stopDragging = useCallback(() => {
    dragging.current = false;
    setIsDragging(false);
  }, []);

  useEffect(() => {
    function onPointerUp() {
      stopDragging();
    }
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [stopDragging]);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (disabled) return;
    dragging.current = true;
    setIsDragging(true);
    lastPointer.current = { x: event.clientX, y: event.clientY };
    frameRef.current?.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current || disabled) return;

    const dx = event.clientX - lastPointer.current.x;
    const dy = event.clientY - lastPointer.current.y;
    lastPointer.current = { x: event.clientX, y: event.clientY };

    onChange({
      x: Math.min(100, Math.max(0, position.x - dx * DRAG_SENSITIVITY)),
      y: Math.min(100, Math.max(0, position.y - dy * DRAG_SENSITIVITY)),
    });
  }

  function handleSliderChange(axis: "x" | "y", value: string) {
    const next = Number(value);
    if (!Number.isFinite(next)) return;
    onChange({ ...position, [axis]: Math.min(100, Math.max(0, next)) });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-[var(--id-text-muted)]">
          Drag the image to choose what shows on your marketplace card.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn(pmSecondaryButtonClass, "h-8 shrink-0 px-2.5 text-xs")}
          onClick={() => onChange(DEFAULT_COVER_IMAGE_POSITION)}
        >
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          Reset
        </Button>
      </div>

      <div
        ref={frameRef}
        className={cn(
          "relative h-36 overflow-hidden rounded-2xl border border-[var(--id-border-strong)] bg-[var(--id-surface)] sm:h-40",
          !disabled && "cursor-grab",
          isDragging && "cursor-grabbing"
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerLeave={stopDragging}
      >
        <Image
          src={imageUrl}
          alt="Adjust cover position"
          fill
          className="pointer-events-none select-none object-cover"
          style={{ objectPosition: coverImagePositionCss(position) }}
          draggable={false}
          unoptimized
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        {!disabled && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1 text-[11px] font-medium text-white">
              <Move className="h-3.5 w-3.5" />
              Drag to reposition
            </span>
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5 text-xs text-[var(--id-text-muted)]">
          Horizontal
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round(position.x)}
            disabled={disabled}
            onChange={(e) => handleSliderChange("x", e.target.value)}
            className="w-full accent-[var(--id-accent)]"
          />
        </label>
        <label className="space-y-1.5 text-xs text-[var(--id-text-muted)]">
          Vertical
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round(position.y)}
            disabled={disabled}
            onChange={(e) => handleSliderChange("y", e.target.value)}
            className="w-full accent-[var(--id-accent)]"
          />
        </label>
      </div>
    </div>
  );
}
