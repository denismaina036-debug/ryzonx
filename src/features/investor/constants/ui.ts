import {
  ryvonxCardClass,
  ryvonxCardElevatedClass,
  ryvonxEmptyStateShellClass,
  ryvonxFieldLabelClass,
  ryvonxInputClass,
  ryvonxTextareaClass,
  ryvonxPageSubtitleClass,
  ryvonxPageTitleClass,
} from "@/lib/ui/ryvonx-tokens";

/** Shared investor dashboard surface tokens — aligned with global RyvonX primitives. */

export const investorPageTitleClass = ryvonxPageTitleClass;

export const investorPageSubtitleClass = ryvonxPageSubtitleClass;

export const investorCardClass = ryvonxCardClass;

export const investorCardElevatedClass = ryvonxCardElevatedClass;

export const investorInputClass = ryvonxInputClass;

export const investorTextareaClass = ryvonxTextareaClass;

export const investorLabelClass = ryvonxFieldLabelClass;

export const investorReadOnlyClass =
  "flex min-h-11 items-center rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] px-4 text-sm text-[var(--id-text-secondary)]";

export const investorEmptyStateClass = ryvonxEmptyStateShellClass;

export {
  RyvonxAlert,
  RyvonxEmptyState,
  RyvonxPageHeader,
  RyvonxSectionCard,
} from "@/components/ui/ryvonx-shell";
