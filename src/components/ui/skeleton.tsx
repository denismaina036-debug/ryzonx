"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-surface-2",
        className
      )}
      {...props}
    />
  );
}

const MetricCardSkeleton = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("surface-card space-y-3 p-6", className)}
    {...props}
  >
    <Skeleton className="h-4 w-24" />
    <Skeleton className="h-8 w-32" />
    <Skeleton className="h-3 w-16" />
  </div>
));
MetricCardSkeleton.displayName = "MetricCardSkeleton";

export { Skeleton, MetricCardSkeleton };
