import { cn } from "@/lib/utils";
import {
  pmCardClass,
  pmEyebrowClass,
  pmHeroClass,
  pmHeroGradientClass,
  pmSubtitleClass,
  pmTitleClass,
} from "@/features/pool-manager/constants/ui";

export function PmPageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
  hero = false,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  /** When true, renders inside a dual-theme hero panel (indigo + amber gradient). */
  hero?: boolean;
}) {
  const content = (
    <div className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="relative z-10 min-w-0">
        {eyebrow && <p className={pmEyebrowClass}>{eyebrow}</p>}
        <h1 className={cn(eyebrow ? "mt-2" : "", pmTitleClass)}>{title}</h1>
        {description && <p className={cn("mt-2 max-w-2xl", pmSubtitleClass)}>{description}</p>}
      </div>
      {actions && (
        <div className="relative z-10 flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );

  if (!hero) return content;

  return (
    <div className={pmHeroClass}>
      <div className={pmHeroGradientClass} aria-hidden />
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[var(--id-accent-soft)] blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-12 left-1/3 h-40 w-40 rounded-full bg-[var(--pm-accent-soft)] blur-3xl"
        aria-hidden
      />
      {content}
    </div>
  );
}

export function PmSectionCard({
  title,
  description,
  children,
  actions,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn(pmCardClass, "p-6", className)}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-[var(--id-text)]">{title}</h2>
          {description && (
            <p className={cn("mt-1.5 max-w-2xl text-sm leading-relaxed", pmSubtitleClass)}>
              {description}
            </p>
          )}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function PmFormMessage({
  message,
  variant = "info",
}: {
  message: string | null;
  variant?: "info" | "success" | "error";
}) {
  if (!message) return null;
  const styles =
    variant === "error"
      ? "border-[var(--id-danger)]/30 bg-[var(--id-danger)]/10 text-[var(--id-danger)]"
      : variant === "success"
        ? "border-[var(--id-success)]/30 bg-[var(--id-success)]/10 text-[var(--id-success)]"
        : "border-[var(--id-accent)]/30 bg-[var(--id-accent-soft)] text-[var(--id-accent-text)]";
  return (
    <p className={cn("rounded-lg border px-4 py-3 text-sm", styles)} role="status">
      {message}
    </p>
  );
}
