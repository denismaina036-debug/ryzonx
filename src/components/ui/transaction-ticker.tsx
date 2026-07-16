"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownToLine, ArrowUpFromLine, ArrowRight } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { motion as motionTokens } from "@/constants/design-tokens";
import { cn, formatCurrency } from "@/lib/utils";
import type { ActivityItem } from "@/types";

const POP_INTERVAL_MS = 30_000;

const typeConfig = {
  deposit: {
    icon: ArrowDownToLine,
    label: "deposited",
    iconClass: "bg-emerald-50 text-emerald-600",
    amountClass: "text-emerald-700",
  },
  withdrawal: {
    icon: ArrowUpFromLine,
    label: "withdrew",
    iconClass: "bg-gold-50 text-gold-600",
    amountClass: "text-gold-700",
  },
} as const;

interface TransactionTickerProps {
  items: ActivityItem[];
  className?: string;
}

function LiveTransactionPop({ item }: { item: ActivityItem }) {
  if (item.type !== "deposit" && item.type !== "withdrawal") return null;

  const config = typeConfig[item.type];
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
      className="flex min-w-0 flex-1 items-center justify-center gap-2.5 sm:gap-3"
    >
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full sm:h-8 sm:w-8",
          config.iconClass
        )}
      >
        <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </div>
      <p className="truncate text-sm text-navy-700">
        <span className="font-medium text-navy-950">{item.displayName}</span>{" "}
        <span className="hidden sm:inline">{config.label}</span>
        <span className="sm:hidden">
          {item.type === "deposit" ? "in" : "out"}
        </span>
        <span className="mx-1.5 text-navy-300">·</span>
        <span className={cn("font-mono font-semibold", config.amountClass)}>
          {formatCurrency(item.amount)}
        </span>
      </p>
    </motion.div>
  );
}

export function TransactionTicker({ items, className }: TransactionTickerProps) {
  const transactions = items.filter(
    (item) => item.type === "deposit" || item.type === "withdrawal"
  );

  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (transactions.length <= 1) return;

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % transactions.length);
    }, POP_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [transactions.length]);

  if (transactions.length === 0) return null;

  const current = transactions[index] ?? transactions[0];
  if (!current) return null;

  return (
    <aside
      className={cn("mx-auto w-full max-w-2xl", className)}
      aria-label="Live fund transactions"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-white/70 px-3 py-2.5 shadow-sm backdrop-blur-md sm:gap-4 sm:px-4 sm:py-3">
        <div className="flex shrink-0 items-center gap-2 border-r border-border/60 pr-3 sm:pr-4">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <p className="hidden text-xs font-semibold uppercase tracking-wider text-navy-500 sm:block">
            Live
          </p>
        </div>

        <div className="flex min-h-[32px] min-w-0 flex-1 items-center overflow-hidden">
          <AnimatePresence mode="wait">
            <LiveTransactionPop key={`${current.id}-${index}`} item={current} />
          </AnimatePresence>
        </div>

        <Link
          href={ROUTES.activity}
          className="inline-flex shrink-0 items-center gap-1 border-l border-border/60 pl-3 text-xs font-medium text-royal-600 transition-colors hover:text-royal-700 sm:pl-4"
        >
          <span className="hidden sm:inline">View all</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </aside>
  );
}
