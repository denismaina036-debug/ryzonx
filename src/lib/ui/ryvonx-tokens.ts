/** Shared RyvonX surface tokens — investor, pool manager, and marketplace shells. */

export const ryvonxPageTitleClass =
  "text-2xl font-semibold tracking-tight text-[var(--id-text)] sm:text-[1.85rem]";

export const ryvonxPageSubtitleClass =
  "mt-2 max-w-2xl text-sm leading-relaxed text-[var(--id-text-secondary)]";

export const ryvonxEyebrowClass =
  "text-xs font-semibold uppercase tracking-[0.18em] text-[var(--id-accent-text)]";

export const ryvonxSectionTitleClass =
  "text-lg font-semibold tracking-tight text-[var(--id-text)]";

export const ryvonxSectionDescriptionClass =
  "mt-1.5 max-w-2xl text-sm leading-relaxed text-[var(--id-text-secondary)]";

export const ryvonxCardClass =
  "rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] shadow-[var(--id-shadow)]";

export const ryvonxCardMutedClass =
  "rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface-muted)] shadow-[var(--id-shadow)]";

export const ryvonxCardElevatedClass =
  "rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] shadow-[var(--id-shadow-lg)]";

export const ryvonxCardPaddingClass = "p-5 sm:p-6";

export const ryvonxListContainerClass =
  "overflow-hidden rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] shadow-[var(--id-shadow)]";

export const ryvonxListDividerClass = "divide-y divide-[var(--id-border)]";

export const ryvonxEmptyStateShellClass =
  "rounded-[var(--id-radius)] border border-dashed border-[var(--id-border)] bg-[var(--id-surface-muted)] px-6 py-14 text-center shadow-[var(--id-shadow)]";

export const ryvonxStatLabelClass = "text-xs text-[var(--id-text-muted)]";

export const ryvonxStatValueClass = "text-2xl font-bold text-[var(--id-text)]";

export const ryvonxInputClass =
  "h-11 rounded-xl border border-[var(--id-border-strong)] bg-[var(--id-surface)] px-4 text-sm text-[var(--id-text)] shadow-sm transition-[border-color,box-shadow] placeholder:text-[var(--id-text-faint)] hover:border-[var(--id-text-muted)] focus-visible:border-[var(--id-accent)] focus-visible:ring-2 focus-visible:ring-[var(--id-accent-soft)] focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50";

export const ryvonxTextareaClass =
  "min-h-[120px] w-full resize-y rounded-xl border border-[var(--id-border-strong)] bg-[var(--id-surface)] px-4 py-3 text-sm leading-relaxed text-[var(--id-text)] shadow-sm transition-[border-color,box-shadow] placeholder:text-[var(--id-text-faint)] hover:border-[var(--id-text-muted)] focus-visible:border-[var(--id-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--id-accent-soft)] focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50";

export const ryvonxFieldLabelClass =
  "mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--id-text-muted)]";

export const ryvonxAlertStyles = {
  info: "border-[var(--id-accent)]/30 bg-[var(--id-accent-soft)] text-[var(--id-accent-text)]",
  success: "border-[var(--id-success)]/30 bg-[var(--id-success)]/10 text-[var(--id-success)]",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200",
  error: "border-[var(--id-danger)]/30 bg-[var(--id-danger)]/10 text-[var(--id-danger)]",
} as const;

export type RyvonxAlertVariant = keyof typeof ryvonxAlertStyles;
