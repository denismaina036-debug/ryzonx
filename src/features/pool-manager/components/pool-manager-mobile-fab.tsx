"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpFromLine,
  BookOpen,
  Headphones,
  Landmark,
  Layers,
  Plus,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import type { PoolManagerQuickActionContext } from "@/services/pool-manager-workspace.service";
import { cn } from "@/lib/utils";

interface FabAction {
  label: string;
  href: string;
  icon: LucideIcon;
  tone: "accent" | "neutral";
}

function buildPoolManagerFabActions(
  context: PoolManagerQuickActionContext
): FabAction[] {
  const actions: FabAction[] = [];

  let primary: FabAction;
  if (context.hasActiveCycle && context.activeCycleId) {
    primary = {
      label: "Record Trade",
      href: `${ROUTES.poolManagerInvestmentCycles}/${context.activeCycleId}/journal`,
      icon: BookOpen,
      tone: "accent",
    };
  } else if (context.hasApprovedPool && context.approvedPoolId) {
    primary = {
      label: "Open Investment Cycle",
      href: `${ROUTES.poolManagerPools}/${context.approvedPoolId}`,
      icon: RefreshCw,
      tone: "accent",
    };
  } else if (context.hasApprovedStrategy) {
    primary = {
      label: "Create Pool",
      href: `${ROUTES.poolManagerPools}/new`,
      icon: Landmark,
      tone: "accent",
    };
  } else {
    primary = {
      label: "Create Strategy",
      href: `${ROUTES.poolManagerStrategies}/new`,
      icon: Layers,
      tone: "accent",
    };
  }

  actions.push(primary);

  if (primary.label !== "Create Strategy") {
    actions.push({
      label: "Create Strategy",
      href: `${ROUTES.poolManagerStrategies}/new`,
      icon: Layers,
      tone: "neutral",
    });
  }
  if (primary.label !== "Create Pool" && context.hasApprovedStrategy) {
    actions.push({
      label: "Create Pool",
      href: `${ROUTES.poolManagerPools}/new`,
      icon: Landmark,
      tone: "neutral",
    });
  }
  if (
    primary.label !== "Open Investment Cycle" &&
    context.hasApprovedPool &&
    context.approvedPoolId
  ) {
    actions.push({
      label: "Open Investment Cycle",
      href: `${ROUTES.poolManagerPools}/${context.approvedPoolId}`,
      icon: RefreshCw,
      tone: "neutral",
    });
  }
  if (primary.label !== "Record Trade") {
    actions.push({
      label: "Record Trade",
      href: context.activeCycleId
        ? `${ROUTES.poolManagerInvestmentCycles}/${context.activeCycleId}/journal`
        : ROUTES.poolManagerJournal,
      icon: BookOpen,
      tone: "neutral",
    });
  }

  actions.push({
    label: "Withdraw Earnings",
    href: ROUTES.poolManagerFinance,
    icon: ArrowUpFromLine,
    tone: "neutral",
  });
  actions.push({
    label: "Contact Support",
    href: ROUTES.support,
    icon: Headphones,
    tone: "neutral",
  });

  const seen = new Set<string>();
  return actions.filter((action) => {
    if (seen.has(action.label)) return false;
    seen.add(action.label);
    return true;
  });
}

export function PoolManagerMobileFab({
  context,
}: {
  context: PoolManagerQuickActionContext;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const actions = buildPoolManagerFabActions(context);

  function handleNavigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 lg:hidden">
      <AnimatePresence>
        {open && (
          <motion.button
            type="button"
            aria-label="Close quick actions"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setOpen(false)}
            className="pointer-events-auto fixed inset-0 bg-black/50 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <div className="absolute inset-x-0 bottom-0 h-0">
        <AnimatePresence>
          {open && (
            <motion.ul
              className="pointer-events-auto absolute bottom-[calc(env(safe-area-inset-bottom)+92px)] left-1/2 flex w-[min(88vw,20rem)] -translate-x-1/2 flex-col gap-2.5"
              initial="closed"
              animate="open"
              exit="closed"
              variants={{
                open: { transition: { staggerChildren: 0.05, delayChildren: 0.03 } },
                closed: { transition: { staggerChildren: 0.03, staggerDirection: -1 } },
              }}
            >
              {actions.map((action) => {
                const Icon = action.icon;
                return (
                  <motion.li
                    key={action.label}
                    variants={{
                      open: { opacity: 1, y: 0, scale: 1 },
                      closed: { opacity: 0, y: 16, scale: 0.96 },
                    }}
                    transition={{ type: "spring", stiffness: 420, damping: 30 }}
                  >
                    <button
                      type="button"
                      onClick={() => handleNavigate(action.href)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left shadow-[var(--id-shadow-lg)] transition-colors",
                        action.tone === "accent"
                          ? "border-transparent text-white [background:var(--pm-brand-gradient)]"
                          : "border-[var(--id-border)] bg-[var(--id-surface-elevated)] text-[var(--id-text)]"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                          action.tone === "accent"
                            ? "bg-white/20"
                            : "bg-[var(--id-surface-muted)] text-[var(--pm-accent-text)]"
                        )}
                      >
                        <Icon className="h-4 w-4" strokeWidth={2} />
                      </span>
                      <span className="text-sm font-semibold">{action.label}</span>
                    </button>
                  </motion.li>
                );
              })}
            </motion.ul>
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close quick actions" : "Open quick actions"}
          aria-expanded={open}
          style={{ x: "-50%" }}
          whileTap={{ scale: 0.92, x: "-50%" }}
          className="pointer-events-auto absolute bottom-[calc(env(safe-area-inset-bottom)+18px)] left-1/2 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[0_10px_30px_rgba(79,70,229,0.5)] [background:var(--pm-brand-gradient)] ring-4 ring-[var(--id-bg)]"
        >
          <motion.span
            animate={{ rotate: open ? 135 : 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 26 }}
          >
            <Plus className="h-6 w-6" strokeWidth={2.25} />
          </motion.span>
        </motion.button>
      </div>
    </div>
  );
}
