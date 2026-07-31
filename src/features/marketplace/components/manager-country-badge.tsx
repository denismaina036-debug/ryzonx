import { normalizeCountryCode } from "@/constants/countries";
import { countryFlagImageUrl } from "@/lib/country-flag";
import { cn } from "@/lib/utils";

interface ManagerCountryBadgeProps {
  countryCode: string | null | undefined;
  className?: string;
  size?: "sm" | "md";
}

export function ManagerCountryBadge({
  countryCode,
  className,
  size = "sm",
}: ManagerCountryBadgeProps) {
  const code = normalizeCountryCode(countryCode);
  if (!code) return null;

  const flagHeight = size === "sm" ? 14 : 18;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--id-border-strong)] bg-[var(--id-surface)] shadow-sm",
        size === "sm" ? "px-1.5 py-0.5" : "px-2 py-1",
        className
      )}
      title={code}
      aria-label={`Manager country: ${code}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={countryFlagImageUrl(code, flagHeight)}
        alt=""
        width={Math.round(flagHeight * 1.5)}
        height={flagHeight}
        className="rounded-[2px] object-cover ring-1 ring-black/5"
        loading="lazy"
        decoding="async"
      />
      <span
        className={cn(
          "font-bold uppercase tracking-wide text-[var(--id-text-secondary)]",
          size === "sm" ? "text-[10px]" : "text-[11px]"
        )}
      >
        {code}
      </span>
    </span>
  );
}
