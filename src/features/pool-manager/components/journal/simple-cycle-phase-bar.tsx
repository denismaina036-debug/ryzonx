"use client";

import {
  SIMPLIFIED_CYCLE_PHASES,
  SIMPLIFIED_CYCLE_PHASE_LABELS,
  resolveSimplifiedCyclePhase,
  type SimplifiedCyclePhase,
} from "@/constants/cycle-progress";

export function SimpleCyclePhaseBar({
  cycleStatus,
  className,
}: {
  cycleStatus: string;
  className?: string;
}) {
  const current = resolveSimplifiedCyclePhase({ cycleStatus });
  const currentIndex = SIMPLIFIED_CYCLE_PHASES.indexOf(current);

  return (
    <div className={className}>
      <ol className="flex gap-2">
        {SIMPLIFIED_CYCLE_PHASES.map((phase, index) => {
          const active = index <= currentIndex;
          const isCurrent = phase === current;
          return (
            <li
              key={phase}
              className={`flex-1 rounded-full px-4 py-2 text-center text-xs font-semibold transition-colors ${
                isCurrent
                  ? "bg-[var(--pm-accent-soft)] text-[var(--pm-accent-text)] ring-1 ring-inset ring-[var(--pm-accent-ring)]"
                  : active
                    ? "bg-[var(--id-surface-muted)] text-[var(--id-text-secondary)]"
                    : "bg-[var(--id-surface-muted)] text-[var(--id-text-faint)]"
              }`}
            >
              {SIMPLIFIED_CYCLE_PHASE_LABELS[phase as SimplifiedCyclePhase]}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
