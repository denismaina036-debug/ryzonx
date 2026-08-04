/** Pool Manager workspace — blends investor platform tokens with PM amber accent. */

import {
  ryvonxCardElevatedClass,
  ryvonxCardMutedClass,
  ryvonxPageSubtitleClass,
  ryvonxPageTitleClass,
  ryvonxStatLabelClass,
  ryvonxStatValueClass,
} from "@/lib/ui/ryvonx-tokens";

export const pmCardClass = ryvonxCardMutedClass;

export const pmCardElevatedClass = ryvonxCardElevatedClass;

export const pmHeroClass =
  "relative overflow-hidden rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface-muted)] p-5 sm:p-8";

export const pmHeroGradientClass =
  "pointer-events-none absolute inset-0 bg-[var(--pm-hero-gradient)]";

export const pmPrimaryButtonClass =
  "rounded-xl bg-[var(--pm-accent)] font-semibold text-[#0a0f18] hover:bg-[var(--pm-accent-hover)] active:opacity-90 active:scale-[0.97] touch-manipulation transition-all duration-150";

export const pmSecondaryButtonClass =
  "rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] text-[var(--id-text)] hover:bg-[var(--id-surface-hover)] active:bg-[var(--id-surface-hover)] active:scale-[0.97] touch-manipulation transition-all duration-150";

export const pmAccentButtonClass =
  "rounded-xl border border-[var(--id-accent-soft)] bg-[var(--id-accent-soft)] text-[var(--id-accent-text)] hover:opacity-90 active:opacity-80 active:scale-[0.97] touch-manipulation transition-all duration-150";

export const pmNavActiveClass =
  "bg-[var(--pm-accent-soft)] text-[var(--pm-accent-text)] ring-1 ring-inset ring-[var(--pm-accent-ring)]";

export const pmNavIdleClass =
  "text-[var(--id-text-muted)] hover:bg-[var(--id-surface-hover)] hover:text-[var(--id-text-secondary)] active:bg-[var(--id-surface-hover)] active:scale-[0.98] touch-manipulation transition-all duration-150";

export const pmEyebrowClass =
  "text-xs font-semibold uppercase tracking-[0.2em] text-[var(--pm-accent-text)]";

export const pmTitleClass = ryvonxPageTitleClass;

export const pmSubtitleClass = ryvonxPageSubtitleClass;

export const pmStatValueClass = ryvonxStatValueClass;

export const pmStatLabelClass = ryvonxStatLabelClass;

export const pmLinkClass =
  "text-xs font-medium text-[var(--pm-accent-text)] hover:text-[var(--pm-accent-hover)]";

export const pmListLinkClass =
  "truncate font-medium text-[var(--id-text)] hover:text-[var(--pm-accent-text)]";

/** Form controls — theme-aware, works in light and dark pool-manager workspace */
export const pmInputClass =
  "h-11 rounded-xl border border-[var(--id-border-strong)] bg-[var(--id-surface)] px-4 text-sm font-medium text-[var(--id-text)] shadow-sm transition-[border-color,box-shadow] placeholder:text-[var(--id-text-faint)] placeholder:font-normal hover:border-[var(--id-text-muted)] focus-visible:border-[var(--pm-accent)] focus-visible:ring-2 focus-visible:ring-[var(--pm-accent-ring)] focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50";

export const pmTextareaClass =
  "min-h-[7rem] rounded-xl border border-[var(--id-border-strong)] bg-[var(--id-surface)] px-4 py-3 text-sm leading-relaxed text-[var(--id-text)] shadow-sm transition-[border-color,box-shadow] placeholder:text-[var(--id-text-faint)] hover:border-[var(--id-text-muted)] focus-visible:border-[var(--pm-accent)] focus-visible:ring-2 focus-visible:ring-[var(--pm-accent-ring)] focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50";

export const pmSelectTriggerClass =
  "h-11 rounded-xl border border-[var(--id-border-strong)] bg-[var(--id-surface)] px-4 text-sm font-medium text-[var(--id-text)] shadow-sm transition-[border-color,box-shadow] hover:border-[var(--id-text-muted)] focus:border-[var(--pm-accent)] focus:ring-2 focus:ring-[var(--pm-accent-ring)] focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:text-[var(--id-text)] [&>span[data-placeholder]]:text-[var(--id-text-faint)]";

/** Portaled select menus — use explicit light/dark colors (outside workspace DOM tree) */
export const pmSelectContentClass =
  "z-50 border border-slate-200 bg-white text-slate-900 shadow-xl dark:border-white/10 dark:bg-[#161825] dark:text-white";

export const pmSelectItemClass =
  "cursor-pointer rounded-lg text-slate-800 focus:bg-slate-100 dark:text-slate-100 dark:focus:bg-white/10";

export const pmFieldLabelClass =
  "text-sm font-semibold tracking-tight text-[var(--id-text)]";

export const pmFieldHintClass =
  "mt-1 text-xs leading-relaxed text-[var(--id-text-secondary)]";

export const pmReadOnlyClass =
  "flex h-11 items-center rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] px-4 text-sm text-[var(--id-text-secondary)]";

export const pmRequiredMarkClass = "text-[var(--pm-accent-text)]";

export const pmFormGuideClass =
  "rounded-xl border border-[var(--pm-accent-ring)] bg-[var(--pm-accent-muted)] px-5 py-4";

export const pmFormGuideTitleClass =
  "text-sm font-semibold text-[var(--id-text)]";

export const pmFormGuideListClass =
  "mt-2.5 space-y-1.5 text-xs leading-relaxed text-[var(--id-text-secondary)]";

export { RyvonxEmptyState, RyvonxAlert } from "@/components/ui/ryvonx-shell";

