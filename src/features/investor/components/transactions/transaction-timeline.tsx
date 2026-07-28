import { cn } from "@/lib/utils";
import type { TransactionTimelineStep } from "@/domain/transaction/types";

export function TransactionTimeline({ steps }: { steps: TransactionTimelineStep[] }) {
  return (
    <ol className="space-y-0">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const dotClass =
          step.state === "completed"
            ? "bg-[var(--id-success)]"
            : step.state === "current"
              ? "bg-[var(--id-accent)] ring-4 ring-[var(--id-accent-soft)]"
              : step.state === "failed"
                ? "bg-[var(--id-danger)]"
                : "bg-[var(--id-border-strong)]";

        const textClass =
          step.state === "upcoming"
            ? "text-[var(--id-text-faint)]"
            : step.state === "failed"
              ? "text-[var(--id-danger)]"
              : "text-[var(--id-text)]";

        return (
          <li key={`${step.label}-${index}`} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", dotClass)} />
              {!isLast && (
                <span className="my-1 w-px flex-1 min-h-[1.25rem] bg-[var(--id-border)]" />
              )}
            </div>
            <div className={cn("pb-5 text-sm font-medium", textClass, isLast && "pb-0")}>
              {step.label}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
