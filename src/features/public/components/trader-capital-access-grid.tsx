"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { registerRoute, REGISTRATION_INTENTS } from "@/constants/registration";
import { admissionTierFee, type PmAdmissionTier } from "@/domain/pool-manager/admission-tier";
import type { PoolManagerAdmissionPath } from "@/domain/pool-manager/types";
import { formatCurrency, cn } from "@/lib/utils";

export function TraderCapitalAccessGrid({ tiers }: { tiers: PmAdmissionTier[] }) {
  const [path, setPath] = useState<PoolManagerAdmissionPath>("trading_challenge");
  const [selectedTierId, setSelectedTierId] = useState<string | null>(
    () => tiers.find((tier) => tier.isFeatured)?.id ?? tiers[0]?.id ?? null
  );
  const challenge = path === "trading_challenge";
  const selectedTier = tiers.find((tier) => tier.id === selectedTierId) ?? tiers[0] ?? null;
  const registrationHref = selectedTier
    ? `${registerRoute(REGISTRATION_INTENTS.CREATE_POOL)}&tier=${encodeURIComponent(selectedTier.slug)}&path=${path}`
    : registerRoute(REGISTRATION_INTENTS.CREATE_POOL);

  return (
    <section className="relative overflow-hidden bg-[#06101f] px-4 py-16 text-white sm:py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(37,99,235,.22),transparent_34rem),radial-gradient(circle_at_88%_80%,rgba(99,102,241,.16),transparent_32rem)]" />
      <div className="relative mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-400/25 bg-blue-400/[.07] px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[.18em] text-blue-300"><Sparkles className="h-3.5 w-3.5" />Trade with RyvonX capital</span>
          <h2 className="mt-5 text-3xl font-semibold tracking-[-0.035em] text-white sm:text-4xl">Choose the mandate that matches your ambition</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">Qualify through a one-phase evaluation or apply for Instant Access. Every route includes professional review and a clearly defined capital ceiling.</p>
          <div className="mx-auto mt-7 inline-flex rounded-xl border border-white/10 bg-white/[.055] p-1 shadow-[0_18px_50px_rgba(0,0,0,.22)] backdrop-blur-xl">
            <button type="button" onClick={() => setPath("trading_challenge")} className={cn("rounded-lg px-5 py-2.5 text-sm font-semibold transition-all", challenge ? "bg-blue-600 text-white shadow-lg shadow-blue-950/30" : "text-slate-300 hover:text-white")}>One-Phase Challenge</button>
            <button type="button" onClick={() => setPath("direct_access")} className={cn("rounded-lg px-5 py-2.5 text-sm font-semibold transition-all", !challenge ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-blue-950/30" : "text-slate-300 hover:text-white")}>Instant Access</button>
          </div>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {tiers.map((tier) => {
            const selected = tier.id === selectedTier?.id;
            return (
            <button
              key={tier.id}
              type="button"
              aria-pressed={selected}
              onClick={() => setSelectedTierId(tier.id)}
              className={cn(
                "relative flex flex-col rounded-2xl border p-5 text-left backdrop-blur-xl transition-all duration-300 hover:-translate-y-1",
                selected
                  ? "border-blue-300 bg-blue-400/[.14] shadow-[0_22px_60px_rgba(37,99,235,.25)] ring-1 ring-blue-300/45"
                  : tier.isFeatured
                    ? "border-blue-400/45 bg-blue-400/[.1] shadow-[0_22px_60px_rgba(37,99,235,.18)]"
                    : "border-white/10 bg-white/[.045] hover:border-blue-300/40"
              )}
            >
              {tier.isFeatured && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-500 px-3 py-1 text-[9px] font-bold uppercase tracking-[.15em] text-white">Most popular</span>}
              {selected && <span className="absolute right-4 top-4 rounded-full bg-blue-300/15 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-blue-100">Selected</span>}
              <p className="text-xs font-semibold uppercase tracking-[.16em] text-blue-300">{tier.name}</p>
              <p className="mt-3 font-mono text-2xl font-semibold tracking-tight text-white">{formatCurrency(tier.maxCapital)}</p>
              <p className="mt-1 text-xs text-slate-400">Maximum capital mandate</p>
              <div className="my-5 h-px bg-gradient-to-r from-white/15 to-transparent" />
              <p className="text-3xl font-semibold text-white">{formatCurrency(admissionTierFee(tier, path))}</p>
              <p className="mt-1 text-xs text-slate-400">One-time admission fee</p>
              <p className="mt-4 flex-1 text-xs leading-5 text-slate-300">{tier.description}</p>
              <ul className="mt-5 space-y-2 text-xs text-slate-300">
                <li className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />{challenge ? "One evaluation phase" : "No trading challenge"}</li>
                <li className="flex gap-2"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />Professional application review</li>
              </ul>
            </button>
          );
          })}
        </div>

        <div className="mt-9 flex flex-col items-center gap-3 text-center">
          <Button asChild size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-500 text-white shadow-[0_16px_38px_rgba(37,99,235,.3)] hover:from-blue-500 hover:to-indigo-400">
            <Link href={registrationHref}>
              {selectedTier ? `Sign up for ${selectedTier.name}` : "Start Pool Manager application"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          {selectedTier && <p className="text-xs font-medium text-blue-200">{selectedTier.name} · {formatCurrency(selectedTier.maxCapital)} mandate · {formatCurrency(admissionTierFee(selectedTier, path))} one-time fee</p>}
          <p className="text-[11px] text-slate-400">Capital access is subject to identity verification, application review, platform rules, and approval.</p>
        </div>
      </div>
    </section>
  );
}
