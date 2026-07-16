import { Skeleton } from "@/components/ui/skeleton";

export function InvestorDashboardSkeleton() {
  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="mb-6">
        <Skeleton className="h-8 w-64 max-w-full bg-[var(--id-surface-muted)]" />
        <Skeleton className="mt-2 h-4 w-80 max-w-full bg-[var(--id-surface-muted)]" />
        <Skeleton className="mt-3 h-5 w-48 bg-[var(--id-surface-muted)]" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5">
          <Skeleton className="h-72 rounded-2xl bg-[var(--id-surface-muted)]" />
          <Skeleton className="h-80 rounded-2xl bg-[var(--id-surface-muted)]" />
        </div>
        <div className="space-y-5">
          <Skeleton className="h-72 rounded-2xl bg-[var(--id-surface-muted)]" />
          <Skeleton className="h-64 rounded-2xl bg-[var(--id-surface-muted)]" />
        </div>
        <div className="space-y-5">
          <Skeleton className="h-80 rounded-2xl bg-[var(--id-surface-muted)]" />
          <Skeleton className="h-72 rounded-2xl bg-[var(--id-surface-muted)]" />
        </div>
      </div>

      <Skeleton className="mt-5 h-16 rounded-2xl bg-[var(--id-surface-muted)]" />
    </div>
  );
}
