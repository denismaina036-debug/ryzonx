"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

interface MobileGreetingProps {
  firstName: string;
  dailyProfit: number;
  hasInvestments: boolean;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export function MobileGreeting({
  firstName,
  dailyProfit,
  hasInvestments,
}: MobileGreetingProps) {
  const positive = dailyProfit >= 0;
  const TrendIcon = positive ? TrendingUp : TrendingDown;

  return (
    <header>
      <h1 className="text-2xl font-semibold tracking-tight text-[var(--id-text)]">
        {getGreeting()}, {firstName}{" "}
        <span aria-hidden="true" className="inline-block">
          👋
        </span>
      </h1>
      <p className="mt-1 text-sm text-[var(--id-text-secondary)]">
        {hasInvestments
          ? "Your investments are performing well today."
          : "Add funds to your wallet, then invest in a pool."}
      </p>
      <div className="mt-2 inline-flex items-center gap-1.5">
        <TrendIcon
          className={cn(
            "h-3.5 w-3.5",
            positive ? "text-[var(--id-success)]" : "text-[var(--id-danger)]"
          )}
          strokeWidth={2}
        />
        <span
          className={cn(
            "text-sm font-semibold tabular-nums",
            positive ? "text-[var(--id-success)]" : "text-[var(--id-danger)]"
          )}
        >
          {positive ? "+" : ""}
          {formatCurrency(dailyProfit)}
        </span>
        <span className="text-sm text-[var(--id-text-muted)]">Profit today</span>
      </div>
    </header>
  );
}
