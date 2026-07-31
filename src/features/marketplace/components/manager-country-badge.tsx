"use client";

import { useState } from "react";
import { normalizeCountryCode } from "@/constants/countries";
import { countryCodeToFlag, countryFlagImageUrl } from "@/lib/country-flag";
import { cn } from "@/lib/utils";

interface ManagerCountryBadgeProps {
  countryCode: string | null | undefined;
  className?: string;
  size?: "sm" | "md";
}

const FLAG_DISPLAY = {
  sm: { width: 20, height: 14, codeClass: "text-[9px]" },
  md: { width: 24, height: 17, codeClass: "text-[10px]" },
} as const;

export function ManagerCountryBadge({
  countryCode,
  className,
  size = "sm",
}: ManagerCountryBadgeProps) {
  const code = normalizeCountryCode(countryCode);
  const [imageFailed, setImageFailed] = useState(false);

  if (!code) return null;

  const display = FLAG_DISPLAY[size];
  const imageUrl = countryFlagImageUrl(code, display.height);

  return (
    <span
      className={cn("inline-flex shrink-0 items-center gap-1", className)}
      title={code}
      aria-label={`Manager country: ${code}`}
    >
      <span
        className={cn(
          "relative inline-flex shrink-0 overflow-hidden rounded-[3px]",
          "bg-[var(--id-surface-muted)] shadow-sm ring-1 ring-black/10 dark:ring-white/15"
        )}
        style={{ width: display.width, height: display.height }}
      >
        {!imageFailed && imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            width={display.width}
            height={display.height}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span
            className="flex h-full w-full items-center justify-center text-sm leading-none"
            aria-hidden
          >
            {countryCodeToFlag(code)}
          </span>
        )}
      </span>
      <span
        className={cn(
          "font-semibold uppercase tracking-wide text-[var(--id-text-muted)]",
          display.codeClass
        )}
      >
        {code}
      </span>
    </span>
  );
}
