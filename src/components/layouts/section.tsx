import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionContainerProps {
  children: ReactNode;
  className?: string;
  id?: string;
  /** Tighter vertical rhythm and horizontal padding on mobile (landing page). */
  landingMobile?: boolean;
}

export function SectionContainer({
  children,
  className,
  id,
  landingMobile = false,
}: SectionContainerProps) {
  return (
    <section
      id={id}
      className={cn(landingMobile ? "py-10 md:py-24" : "section-spacing", "w-full min-w-0", className)}
    >
      <div
        className={cn(
          "page-container w-full max-w-full",
          landingMobile && "px-4 sm:px-6 lg:px-8"
        )}
      >
        {children}
      </div>
    </section>
  );
}

interface SectionHeaderProps {
  title: string;
  description?: string;
  badge?: string;
  align?: "left" | "center";
  className?: string;
  actions?: ReactNode;
  compactMobile?: boolean;
}

export function SectionHeader({
  title,
  description,
  badge,
  align = "left",
  className,
  actions,
  compactMobile = false,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        compactMobile ? "mb-8 md:mb-12" : "mb-12",
        align === "center" && !actions && "mx-auto max-w-2xl text-center",
        className
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
          align === "center" && !actions && "sm:flex-col sm:items-center"
        )}
      >
        <div className={cn("max-w-2xl", align === "center" && !actions && "mx-auto text-center")}>
          {badge && (
            <span className="mb-4 inline-block rounded-full bg-royal-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-royal-700">
              {badge}
            </span>
          )}
          <h2 className="text-3xl font-semibold tracking-tight text-navy-950 md:text-4xl">
            {title}
          </h2>
          {description && (
            <p className="mt-4 text-lg leading-relaxed text-navy-500">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
