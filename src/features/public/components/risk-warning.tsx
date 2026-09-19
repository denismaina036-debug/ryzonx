import { Info } from "lucide-react";
import type { LandingRiskWarning } from "@/domain/landing-page/types";

export function RiskWarning({ warning }: { warning: LandingRiskWarning }) {
  if (!warning.enabled || !warning.text.trim()) return null;

  return (
    <aside
      aria-label="Risk warning"
      className="relative z-[60] w-full border-b border-slate-200 bg-slate-50 px-4 py-2 text-slate-700"
    >
      <div className="mx-auto flex max-w-[96rem] items-start justify-center gap-2 text-[11px] leading-4 sm:items-center sm:text-xs sm:leading-5">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600 sm:mt-0" aria-hidden="true" />
        <p>{warning.text}</p>
      </div>
    </aside>
  );
}
