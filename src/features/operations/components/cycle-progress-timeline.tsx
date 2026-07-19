"use client";

import { CYCLE_PROGRESS_PHASES, CYCLE_PROGRESS_PHASE_LABELS } from "@/constants/cycle-progress";
import type { CycleProgressPhase } from "@/constants/cycle-progress";
import type { CycleProgressEvent } from "@/domain/trading-journal/types";

export function CycleProgressTimeline({
  currentPhase,
  events,
}: {
  currentPhase: CycleProgressPhase;
  events: Array<{ label: string; occurredAt: string; description?: string | null }>;
}) {
  const currentIndex = CYCLE_PROGRESS_PHASES.indexOf(currentPhase);

  return (
    <div className="space-y-6">
      <ol className="flex flex-wrap gap-2">
        {CYCLE_PROGRESS_PHASES.map((phase, index) => {
          const active = index <= currentIndex;
          const current = phase === currentPhase;
          return (
            <li
              key={phase}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                current
                  ? "bg-amber-500/20 text-amber-200"
                  : active
                    ? "bg-white/10 text-navy-200"
                    : "bg-white/[0.04] text-navy-500"
              }`}
            >
              {CYCLE_PROGRESS_PHASE_LABELS[phase]}
            </li>
          );
        })}
      </ol>

      {events.length === 0 ? (
        <p className="text-sm text-navy-500">No operational events recorded yet.</p>
      ) : (
        <ul className="space-y-3 border-l border-white/10 pl-4">
          {events.slice(0, 10).map((event) => (
            <li key={`${event.label}-${event.occurredAt}`} className="relative">
              <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-amber-400/80" />
              <p className="text-sm text-white">{event.label}</p>
              {event.description && (
                <p className="text-xs text-navy-400">{event.description}</p>
              )}
              <p className="text-xs text-navy-500">
                {new Date(event.occurredAt).toLocaleString("en-GB")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function mapProgressEvents(events: CycleProgressEvent[]) {
  return events.map((e) => ({
    label: e.label,
    occurredAt: e.occurredAt,
    description: e.description,
  }));
}
