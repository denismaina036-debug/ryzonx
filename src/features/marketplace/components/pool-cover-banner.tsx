import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  coverImagePositionCss,
  poolCoverBannerStyle,
  type CoverImagePosition,
} from "@/domain/pools/cover-image-position";

export function PoolCoverBanner({
  coverImageUrl,
  cardBackgroundColor,
  coverImagePosition,
  className,
  children,
}: {
  coverImageUrl?: string | null;
  cardBackgroundColor?: string | null;
  coverImagePosition?: CoverImagePosition | null;
  className?: string;
  children?: ReactNode;
}) {
  const resolvedUrl = coverImageUrl?.trim() || null;

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={
        resolvedUrl
          ? undefined
          : poolCoverBannerStyle({ cardBackgroundColor, coverImagePosition })
      }
    >
      {resolvedUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolvedUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: coverImagePositionCss(coverImagePosition) }}
          loading="lazy"
          decoding="async"
        />
      ) : null}
      {children}
    </div>
  );
}
