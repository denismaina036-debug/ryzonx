"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  Briefcase,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TransactionIconKind } from "@/domain/transaction/types";

const ICON_MAP = {
  deposit: ArrowDownLeft,
  withdrawal: ArrowUpRight,
  investment: Briefcase,
  settlement: Wallet,
  profit: TrendingUp,
  loss: TrendingDown,
  adjustment: SlidersHorizontal,
} as const;

const TONE_MAP: Record<TransactionIconKind, string> = {
  deposit: "bg-[var(--id-success-soft)] text-[var(--id-success)]",
  withdrawal: "bg-orange-500/10 text-orange-400",
  investment: "bg-blue-500/10 text-blue-500 dark:text-blue-400",
  settlement: "bg-purple-500/10 text-purple-500 dark:text-purple-400",
  profit: "bg-[var(--id-success-soft)] text-[var(--id-success)]",
  loss: "bg-red-500/10 text-[var(--id-danger)]",
  adjustment: "bg-[var(--id-surface-muted)] text-[var(--id-text-muted)]",
};

export function TransactionIcon({
  kind,
  size = "md",
  className,
}: {
  kind: TransactionIconKind;
  size?: "sm" | "md";
  className?: string;
}) {
  const Icon = ICON_MAP[kind];
  const boxClass =
    size === "sm" ? "h-8 w-8 rounded-full" : "h-10 w-10 rounded-xl";

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center",
        boxClass,
        TONE_MAP[kind],
        className
      )}
    >
      <Icon className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} strokeWidth={2} />
    </span>
  );
}
