import { Skeleton } from "@/components/ui/skeleton";

export function PmDashboardSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-32 rounded-[var(--id-radius)] bg-[var(--id-surface-muted)]" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-24 rounded-[var(--id-radius)] bg-[var(--id-surface-muted)]"
          />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-[var(--id-radius)] bg-[var(--id-surface-muted)]" />
        <Skeleton className="h-64 rounded-[var(--id-radius)] bg-[var(--id-surface-muted)]" />
      </div>
      <Skeleton className="h-48 rounded-[var(--id-radius)] bg-[var(--id-surface-muted)]" />
    </div>
  );
}
