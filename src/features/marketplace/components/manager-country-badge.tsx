import { countryCodeToFlag } from "@/lib/country-flag";
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
  const code = countryCode?.trim().toUpperCase();
  if (!code || code.length !== 2) return null;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--id-border)] bg-[var(--id-surface-muted)]/80",
        size === "sm" ? "px-1.5 py-0.5" : "px-2 py-0.5",
        className
      )}
      title={code}
      aria-label={`Manager country: ${code}`}
    >
      <span className={cn(size === "sm" ? "text-sm leading-none" : "text-base leading-none")} aria-hidden>
        {countryCodeToFlag(code)}
      </span>
      <span
        className={cn(
          "font-semibold uppercase tracking-wide text-[var(--id-text-muted)]",
          size === "sm" ? "text-[9px]" : "text-[10px]"
        )}
      >
        {code}
      </span>
    </span>
  );
}
