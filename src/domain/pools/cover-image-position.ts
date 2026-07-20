import type { CSSProperties } from "react";

export interface CoverImagePosition {
  /** Horizontal focal point (0 = left, 100 = right). */
  x: number;
  /** Vertical focal point (0 = top, 100 = bottom). */
  y: number;
}

export const DEFAULT_COVER_IMAGE_POSITION: CoverImagePosition = { x: 50, y: 50 };

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 50;
  return Math.min(100, Math.max(0, Math.round(value * 10) / 10));
}

export function parseCoverImagePosition(raw: unknown): CoverImagePosition {
  if (raw == null) return DEFAULT_COVER_IMAGE_POSITION;

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return DEFAULT_COVER_IMAGE_POSITION;
    try {
      return parseCoverImagePosition(JSON.parse(trimmed));
    } catch {
      const match = trimmed.match(/([\d.]+)%\s+([\d.]+)%/);
      if (match) {
        return { x: clampPercent(Number(match[1])), y: clampPercent(Number(match[2])) };
      }
      return DEFAULT_COVER_IMAGE_POSITION;
    }
  }

  if (typeof raw === "object" && !Array.isArray(raw)) {
    const row = raw as { x?: unknown; y?: unknown };
    return {
      x: clampPercent(typeof row.x === "number" ? row.x : 50),
      y: clampPercent(typeof row.y === "number" ? row.y : 50),
    };
  }

  return DEFAULT_COVER_IMAGE_POSITION;
}

export function serializeCoverImagePosition(position: CoverImagePosition): CoverImagePosition {
  return {
    x: clampPercent(position.x),
    y: clampPercent(position.y),
  };
}

export function coverImagePositionCss(position?: CoverImagePosition | null): string {
  const resolved = position ?? DEFAULT_COVER_IMAGE_POSITION;
  return `${resolved.x}% ${resolved.y}%`;
}

export function poolCoverBannerStyle(input: {
  coverImageUrl?: string | null;
  cardBackgroundColor?: string | null;
  coverImagePosition?: CoverImagePosition | null;
}): CSSProperties {
  if (input.coverImageUrl) {
    return {
      backgroundImage: `url(${input.coverImageUrl})`,
      backgroundSize: "cover",
      backgroundPosition: coverImagePositionCss(input.coverImagePosition),
    };
  }

  return {
    background: input.cardBackgroundColor
      ? `linear-gradient(135deg, ${input.cardBackgroundColor} 0%, #0a0f18 100%)`
      : "linear-gradient(135deg, #1a2744 0%, #0a0f18 100%)",
  };
}
