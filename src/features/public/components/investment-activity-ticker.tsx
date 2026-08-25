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
  pool_join: { icon: UserPlus, iconClass: "bg-blue-400/10 text-blue-300", amountClass: "text-blue-300" },
  deposit: { icon: Wallet, iconClass: "bg-emerald-400/10 text-emerald-300", amountClass: "text-emerald-300" },
  withdrawal: { icon: CircleDollarSign, iconClass: "bg-amber-400/10 text-amber-300", amountClass: "text-amber-300" },
  investment_confirmed: { icon: Wallet, iconClass: "bg-blue-400/10 text-blue-300", amountClass: "text-blue-300" },
  pool_settlement: { icon: CircleDollarSign, iconClass: "bg-emerald-400/10 text-emerald-300", amountClass: "text-emerald-300" },
  profit_distribution: { icon: CircleDollarSign, iconClass: "bg-amber-400/10 text-amber-300", amountClass: "text-amber-300" },
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
      className="flex min-w-0 flex-1 items-center gap-2 sm:gap-2.5"
    >
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full sm:h-8 sm:w-8",
          config.iconClass
        )}
      >
        <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-slate-300">
          <span className="font-medium text-white">{item.displayName}</span>
          <span className="hidden xl:inline"> {item.subtitle}</span>
        </p>
        <p className="mt-0.5 truncate text-xs leading-snug text-slate-400 xl:hidden">
          {item.subtitle}
        </p>
      </div>
      <span
        className={cn(
          "shrink-0 font-mono text-sm font-semibold tabular-nums",
          config.amountClass
        )}
      >
        {formatCurrency(item.amount)}
      </span>
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
      className={cn("mx-auto w-full max-w-[38rem]", className)}
      aria-label="Live investment activity"
      aria-live="polite"
    >
      <div className="flex min-h-[3.75rem] items-start gap-3 rounded-2xl border border-blue-300/[.18] bg-[linear-gradient(100deg,rgba(9,25,49,.92),rgba(5,15,31,.82))] px-3.5 py-3 shadow-[0_18px_45px_rgba(0,0,0,.26),inset_0_1px_0_rgba(255,255,255,.035)] backdrop-blur-xl sm:items-center sm:gap-4 sm:px-4.5">
        <div className="flex shrink-0 items-center gap-2 self-center border-r border-white/10 pr-3 sm:pr-4">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <p className="hidden text-[10px] font-semibold uppercase tracking-[.13em] text-slate-300 xl:block">
            Live Activity
          </p>
        </div>

        <div className="flex min-h-[32px] min-w-0 flex-1 items-start overflow-visible sm:items-center sm:overflow-hidden">
          <AnimatePresence mode="wait">
            <LiveInvestmentPop key={`${current.id}-${index}`} item={current} />
          </AnimatePresence>
        </div>

        <Link
          href={ROUTES.activity}
          className="inline-flex shrink-0 self-center items-center gap-1 border-l border-white/10 pl-3 text-xs font-medium text-blue-200 transition-colors hover:text-white sm:pl-4"
        >
          <span className="hidden xl:inline">View all</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </aside>
  );
}
