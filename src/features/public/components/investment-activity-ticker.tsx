"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CircleDollarSign, UserPlus, Wallet } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { motion as motionTokens } from "@/constants/design-tokens";
import { cn, formatCurrency } from "@/lib/utils";
import type { LandingInvestmentActivity } from "@/domain/landing-page/types";

const POP_INTERVAL_MS = 30_000;

const typeConfig = {
  pool_join: { icon: UserPlus, iconClass: "bg-royal-50 text-royal-600", amountClass: "text-royal-700" },
  deposit: { icon: Wallet, iconClass: "bg-emerald-50 text-emerald-600", amountClass: "text-emerald-700" },
  withdrawal: { icon: CircleDollarSign, iconClass: "bg-gold-50 text-gold-600", amountClass: "text-gold-700" },
  investment_confirmed: { icon: Wallet, iconClass: "bg-royal-50 text-royal-600", amountClass: "text-royal-700" },
  pool_settlement: { icon: CircleDollarSign, iconClass: "bg-emerald-50 text-emerald-600", amountClass: "text-emerald-700" },
  profit_distribution: { icon: CircleDollarSign, iconClass: "bg-gold-50 text-gold-600", amountClass: "text-gold-700" },
} as const;

function LiveInvestmentPop({ item }: { item: LandingInvestmentActivity }) {
  const config = typeConfig[item.activityType];
  const Icon = config.icon;

  return (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{
        duration: motionTokens.duration.normal,
        ease: motionTokens.ease.premium,
      }}
      className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-center sm:gap-2.5"
    >
      <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
        <div
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full sm:h-8 sm:w-8",
            config.iconClass
          )}
        >
          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </div>
        <p className="min-w-0 break-words text-sm text-navy-700">
          <span className="font-medium text-navy-950">{item.displayName}</span>
          <span className="hidden sm:inline"> {item.subtitle}</span>
          <span className="mx-1.5 hidden text-navy-300 sm:inline">·</span>
          <span
            className={cn(
              "hidden font-mono font-semibold tabular-nums sm:inline",
              config.amountClass
            )}
          >
            {formatCurrency(item.amount)}
          </span>
        </p>
        <span
          className={cn(
            "ml-auto shrink-0 font-mono text-sm font-semibold tabular-nums sm:hidden",
            config.amountClass
          )}
        >
          {formatCurrency(item.amount)}
        </span>
      </div>
      <p className="break-words pl-9 text-xs leading-snug text-navy-500 sm:hidden">
        {item.subtitle}
      </p>
    </motion.div>
  );
}

export function InvestmentActivityTicker({
  items,
  className,
}: {
  items: LandingInvestmentActivity[];
  className?: string;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % items.length);
    }, POP_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [items.length]);

  if (items.length === 0) return null;

  const current = items[index] ?? items[0];
  if (!current) return null;

  return (
    <aside
      className={cn("mx-auto w-full max-w-2xl", className)}
      aria-label="Live investment activity"
      aria-live="polite"
    >
      <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-white/70 px-3 py-2.5 shadow-sm backdrop-blur-md sm:items-center sm:gap-4 sm:px-4 sm:py-3">
        <div className="flex shrink-0 items-center gap-2 self-center border-r border-border/60 pr-3 sm:pr-4">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <p className="hidden text-xs font-semibold uppercase tracking-wider text-navy-500 sm:block">
            Live
          </p>
        </div>

        <div className="flex min-h-[32px] min-w-0 flex-1 items-start overflow-visible sm:items-center sm:overflow-hidden">
          <AnimatePresence mode="wait">
            <LiveInvestmentPop key={`${current.id}-${index}`} item={current} />
          </AnimatePresence>
        </div>

        <Link
          href={ROUTES.activity}
          className="inline-flex shrink-0 self-center items-center gap-1 border-l border-border/60 pl-3 text-xs font-medium text-royal-600 transition-colors hover:text-royal-700 sm:pl-4"
        >
          <span className="hidden sm:inline">View all</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </aside>
  );
}
