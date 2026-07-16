"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export const cryptoFlowInputClass =
  "h-11 border-[var(--id-border)] bg-[var(--id-surface-muted)] text-[var(--id-text)] placeholder:text-[var(--id-text-faint)] focus-visible:border-[var(--id-accent)] focus-visible:ring-[var(--id-accent-soft)]";

export const cryptoFlowPrimaryButtonClass =
  "h-11 w-full rounded-xl [background:var(--id-accent-gradient)] text-sm font-semibold text-white shadow-[var(--id-shadow-lg)] hover:opacity-95 disabled:opacity-50 sm:w-auto sm:min-w-[220px]";

interface CryptoFlowStepProps {
  step: number;
  title: string;
  active: boolean;
  done?: boolean;
  disabled?: boolean;
  summary?: ReactNode;
  summaryAction?: ReactNode;
  isLast?: boolean;
  children?: ReactNode;
}

export function CryptoFlowStep({
  step,
  title,
  active,
  done,
  disabled,
  summary,
  summaryAction,
  isLast,
  children,
}: CryptoFlowStepProps) {
  const expanded = active && !disabled && !!children;
  const collapsed = done && !expanded;

  return (
    <div
      className={cn(
        "transition-colors duration-200",
        !isLast && "border-b border-[var(--id-border)]",
        disabled && !done && "opacity-45",
        active && !done && "bg-[var(--id-surface-muted)]/40"
      )}
    >
      <div className="flex items-start gap-4 px-5 py-5 sm:px-6">
        <StepIndicator step={step} done={!!done} active={active && !done} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p
              className={cn(
                "text-sm font-semibold",
                active || done ? "text-[var(--id-text)]" : "text-[var(--id-text-muted)]"
              )}
            >
              {title}
            </p>
            {collapsed && summaryAction}
          </div>

          {collapsed && summary && (
            <div className="mt-3 rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] px-4 py-3">
              {summary}
            </div>
          )}

          {expanded && <div className="mt-4">{children}</div>}
        </div>
      </div>
    </div>
  );
}

function StepIndicator({
  step,
  done,
  active,
}: {
  step: number;
  done: boolean;
  active: boolean;
}) {
  return (
    <span
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-1 ring-inset transition-colors",
        done &&
          "bg-[var(--id-success-soft)] text-[var(--id-success)] ring-[var(--id-success)]/30",
        active &&
          !done &&
          "bg-[var(--id-accent-soft)] text-[var(--id-accent-text)] ring-[var(--id-accent)]/40",
        !done &&
          !active &&
          "bg-[var(--id-surface-muted)] text-[var(--id-text-faint)] ring-[var(--id-border)]"
      )}
    >
      {done ? <Check className="h-4 w-4" strokeWidth={2.5} /> : step}
    </span>
  );
}
