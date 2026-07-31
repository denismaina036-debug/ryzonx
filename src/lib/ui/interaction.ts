import { cn } from "@/lib/utils";

/** Removes mobile tap flash and improves touch responsiveness. */
export const touchTarget =
  "touch-manipulation select-none [-webkit-tap-highlight-color:transparent]";

/** Subtle press scale for buttons and primary controls. */
export const tapScale =
  "transition-transform duration-150 ease-out active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100";

/** Header icon buttons (notifications, support, theme). */
export const tapIconButton = cn(
  touchTarget,
  tapScale,
  "transition-colors duration-150",
  "active:bg-[var(--id-surface-hover)] active:opacity-90"
);

/** Profile / avatar triggers. */
export const tapProfileTrigger = cn(
  touchTarget,
  tapScale,
  "transition-colors duration-150",
  "active:bg-[var(--id-surface-hover)]"
);

/** Transaction rows, activity list items, journal entries. */
export const tapRow = cn(
  touchTarget,
  "transition-all duration-150 ease-out",
  "active:bg-[var(--id-surface-hover)] active:scale-[0.995] motion-reduce:active:scale-100"
);

/** Clickable cards (pools, trades, wallets). */
export const tapCard = cn(
  touchTarget,
  "transition-all duration-150 ease-out",
  "active:scale-[0.985] active:bg-[var(--id-surface-hover)] motion-reduce:active:scale-100"
);

/** Bottom navigation items. */
export const tapNavItem = cn(
  touchTarget,
  tapScale,
  "transition-all duration-150",
  "active:bg-[var(--id-surface-hover)]/80"
);

/** Sidebar navigation links. */
export const tapNavLink = cn(
  touchTarget,
  "transition-all duration-150",
  "active:scale-[0.98] active:opacity-90 motion-reduce:active:scale-100"
);

/** Dropdown and menu items. */
export const tapMenuItem = cn(
  touchTarget,
  "transition-all duration-100",
  "active:bg-[var(--id-surface-hover)] active:scale-[0.99] motion-reduce:active:scale-100"
);

/** Tab triggers. */
export const tapTabTrigger = cn(
  touchTarget,
  tapScale,
  "transition-all duration-150"
);
