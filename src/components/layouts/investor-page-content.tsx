import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface InvestorPageContentProps {
  children: ReactNode;
  className?: string;
  wide?: boolean;
}

/** Consistent content width inside the authenticated investor shell. */
export function InvestorPageContent({
  children,
  className,
  wide = false,
}: InvestorPageContentProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full min-w-0 max-w-full pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-10",
        wide ? "max-w-[1400px]" : "max-w-6xl",
        className
      )}
    >
      {children}
    </div>
  );
}
