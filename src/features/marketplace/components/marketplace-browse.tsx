"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, X, Users, Archive } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MARKETPLACE_MANAGER_SORT_OPTIONS,
  MARKETPLACE_MANAGER_TABS,
  MARKETPLACE_SORT_OPTIONS,
  AGGRESSIVENESS_LABELS,
  SECURITY_RATING_LABELS,
  CAPACITY_STATUS_LABELS,
  MARKETPLACE_CATEGORIES,
  MARKETPLACE_CATEGORY_LABELS,
} from "@/constants/marketplace";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MarketplaceManagerCardView } from "@/features/marketplace/components/marketplace-manager-card";
import { MarketplacePoolCardView } from "@/features/marketplace/components/marketplace-pool-card";
import { MarketplaceBreadcrumb, marketplaceHomeCrumb } from "@/features/marketplace/components/marketplace-breadcrumb";
import { MarketplaceHero } from "@/features/marketplace/components/marketplace-hero";
import {
  computeMarketplaceHeroStats,
  pickFeaturedSection,
} from "@/features/marketplace/utils/marketplace-stats";
import type {
  FeaturedManagerSection,
  MarketplaceManagerCard,
  MarketplacePoolCard,
} from "@/domain/marketplace/types";
import type { InvestorCycleCard, InvestorStrategyCard } from "@/domain/investment/investor-presentation";
import { STRATEGY_RISK_PROFILES } from "@/constants/strategy";
import { cn } from "@/lib/utils";

const TAB_ICONS = {
  managers: Users,
  opportunities: Archive,
} as const;

interface MarketplaceBrowseProps {
  managers: MarketplaceManagerCard[];
  pools: MarketplacePoolCard[];
  strategies: InvestorStrategyCard[];
  cycles: InvestorCycleCard[];
  featuredManagerSections: FeaturedManagerSection[];
}

export function MarketplaceBrowse({
  managers,
  pools,
  strategies: _strategies,
  cycles: _cycles,
  featuredManagerSections,
}: MarketplaceBrowseProps) {
  const [activeTab, setActiveTab] = useState<(typeof MARKETPLACE_MANAGER_TABS)[number]["value"]>(
    "opportunities"
  );
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("best_rated");
  const [category, setCategory] = useState("");
  const [securityRating, setSecurityRating] = useState("");
  const [aggressiveness, setAggressiveness] = useState("");
  const [capacityStatus, setCapacityStatus] = useState("");
  const [riskProfile, setRiskProfile] = useState("");
  const [fundingStatus, setFundingStatus] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const heroStats = useMemo(
    () =>
      computeMarketplaceHeroStats({
        pools,
        activeInvestors: managers.reduce((sum, m) => sum + m.activeInvestors, 0),
      }),
    [managers, pools]
  );

  const topSection = useMemo(
    () => pickFeaturedSection(featuredManagerSections),
    [featuredManagerSections]
  );

  const filteredManagers = useMemo(() => {
    let items = [...managers];
    const q = search.trim().toLowerCase();

    if (q) {
      items = items.filter(
        (m) =>
          m.displayName.toLowerCase().includes(q) ||
          (m.tradingStyle?.toLowerCase().includes(q) ?? false) ||
          (m.slug?.toLowerCase().includes(q) ?? false) ||
          m.activeOpportunities.some((p) => p.name.toLowerCase().includes(q))
      );
    }

    if (securityRating) items = items.filter((m) => m.securityRating === securityRating);
    if (aggressiveness) items = items.filter((m) => m.aggressivenessLevel === aggressiveness);

    switch (sort) {
      case "highest_return":
        items.sort((a, b) => (b.avgMonthlyReturnPct ?? 0) - (a.avgMonthlyReturnPct ?? 0));
        break;
      case "most_investors":
        items.sort((a, b) => b.activeInvestors - a.activeInvestors);
        break;
      case "highest_aum":
        items.sort((a, b) => b.assetsUnderManagement - a.assetsUnderManagement);
        break;
      case "most_pools":
        items.sort((a, b) => b.poolsManaged - a.poolsManaged);
        break;
      case "newest":
        items.sort(
          (a, b) =>
            new Date(b.featuredOpportunity?.listedAt ?? 0).getTime() -
            new Date(a.featuredOpportunity?.listedAt ?? 0).getTime()
        );
        break;
      default:
        items.sort((a, b) => (b.ryvonxRating ?? 0) - (a.ryvonxRating ?? 0));
    }

    return items;
  }, [managers, search, sort, securityRating, aggressiveness]);

  const filteredPools = useMemo(() => {
    let items = [...pools];
    const q = search.trim().toLowerCase();

    if (q) {
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.managerName?.toLowerCase().includes(q) ?? false)
      );
    }
    if (category) items = items.filter((p) => p.categories.includes(category));
    if (securityRating) items = items.filter((p) => p.securityRating === securityRating);
    if (aggressiveness) items = items.filter((p) => p.aggressivenessLevel === aggressiveness);
    if (capacityStatus) items = items.filter((p) => p.capacityStatus === capacityStatus);

    switch (sort) {
      case "highest_return":
        items.sort((a, b) => b.overallReturnPct - a.overallReturnPct);
        break;
      case "most_investors":
        items.sort((a, b) => b.activeInvestors - a.activeInvestors);
        break;
      case "highest_aum":
        items.sort((a, b) => b.assetsUnderManagement - a.assetsUnderManagement);
        break;
      case "newest":
        items.sort(
          (a, b) =>
            new Date(b.listedAt ?? 0).getTime() - new Date(a.listedAt ?? 0).getTime()
        );
        break;
      default:
        items.sort((a, b) => (b.ryvonxRating ?? 0) - (a.ryvonxRating ?? 0));
    }

    return items;
  }, [pools, search, sort, category, securityRating, aggressiveness, capacityStatus]);

  const sortOptions =
    activeTab === "managers" ? MARKETPLACE_MANAGER_SORT_OPTIONS : MARKETPLACE_SORT_OPTIONS;

  const searchPlaceholder =
    activeTab === "managers"
      ? "Search pool managers…"
      : "Search live pools…";

  const resultCount =
    activeTab === "managers" ? filteredManagers.length : filteredPools.length;

  return (
    <div className="space-y-12 pb-8">
      <MarketplaceBreadcrumb items={[marketplaceHomeCrumb()]} />

      <MarketplaceHero stats={heroStats} />

      {topSection && activeTab === "managers" && (
        <section className="space-y-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-[var(--id-text)]">
                {topSection.title}
              </h2>
              <p className="mt-1 text-sm text-[var(--id-text-muted)]">
                Curated managers based on platform performance signals
              </p>
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {topSection.managers.slice(0, 3).map((manager) => (
              <MarketplaceManagerCardView key={manager.id} manager={manager} compact />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1 rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)]/50 p-1">
            {MARKETPLACE_MANAGER_TABS.map((tab) => {
              const Icon = TAB_ICONS[tab.value];
              const isActive = activeTab === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setActiveTab(tab.value)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all",
                    isActive
                      ? "bg-[var(--id-surface)] text-[var(--id-text)] shadow-sm"
                      : "text-[var(--id-text-muted)] hover:text-[var(--id-text)]"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 opacity-70" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center lg:max-w-xl lg:justify-end">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--id-text-faint)]" />
              <Input
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 border-[var(--id-border)] bg-[var(--id-surface)] pl-10"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-10 shrink-0 border-[var(--id-border)] lg:hidden"
              onClick={() => setFiltersOpen(true)}
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Filters
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--id-text-muted)]">
            {resultCount} result{resultCount !== 1 ? "s" : ""}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="h-9 w-full border-[var(--id-border)] sm:w-44">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="hidden flex-wrap gap-2 lg:flex">
              <FilterPills
                activeTab={activeTab}
                category={category}
                setCategory={setCategory}
                securityRating={securityRating}
                setSecurityRating={setSecurityRating}
                aggressiveness={aggressiveness}
                setAggressiveness={setAggressiveness}
                capacityStatus={capacityStatus}
                setCapacityStatus={setCapacityStatus}
                riskProfile={riskProfile}
                setRiskProfile={setRiskProfile}
                fundingStatus={fundingStatus}
                setFundingStatus={setFundingStatus}
              />
            </div>
          </div>
        </div>

        <AnimatePresence>
          {filtersOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm lg:hidden"
                onClick={() => setFiltersOpen(false)}
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="fixed inset-x-0 bottom-0 z-50 max-h-[80vh] overflow-y-auto rounded-t-2xl border-t border-[var(--id-border)] bg-[var(--id-surface)] p-6 shadow-2xl lg:hidden"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold text-[var(--id-text)]">Filters</h3>
                  <button type="button" onClick={() => setFiltersOpen(false)} aria-label="Close">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <FilterPills
                  activeTab={activeTab}
                  category={category}
                  setCategory={setCategory}
                  securityRating={securityRating}
                  setSecurityRating={setSecurityRating}
                  aggressiveness={aggressiveness}
                  setAggressiveness={setAggressiveness}
                  capacityStatus={capacityStatus}
                  setCapacityStatus={setCapacityStatus}
                  riskProfile={riskProfile}
                  setRiskProfile={setRiskProfile}
                  fundingStatus={fundingStatus}
                  setFundingStatus={setFundingStatus}
                  stacked
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {activeTab === "managers" && (
          <>
            {filteredManagers.length === 0 ? (
              <EmptyState message="No managers match your filters. Try adjusting your search." />
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {filteredManagers.map((manager) => (
                  <MarketplaceManagerCardView key={manager.id} manager={manager} />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === "opportunities" && (
          <>
            {filteredPools.length === 0 ? (
              <EmptyState message="No live pools match your filters." />
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {filteredPools.map((pool) => (
                  <MarketplacePoolCardView key={pool.id} pool={pool} />
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-[var(--id-radius)] border border-dashed border-[var(--id-border)] py-20 text-center">
      <p className="text-sm text-[var(--id-text-muted)]">{message}</p>
    </div>
  );
}

function FilterPills({
  activeTab,
  category,
  setCategory,
  securityRating,
  setSecurityRating,
  aggressiveness,
  setAggressiveness,
  capacityStatus,
  setCapacityStatus,
  riskProfile,
  setRiskProfile,
  fundingStatus,
  setFundingStatus,
  stacked = false,
}: {
  activeTab: string;
  category: string;
  setCategory: (v: string) => void;
  securityRating: string;
  setSecurityRating: (v: string) => void;
  aggressiveness: string;
  setAggressiveness: (v: string) => void;
  capacityStatus: string;
  setCapacityStatus: (v: string) => void;
  riskProfile: string;
  setRiskProfile: (v: string) => void;
  fundingStatus: string;
  setFundingStatus: (v: string) => void;
  stacked?: boolean;
}) {
  const triggerClass = stacked ? "w-full" : "h-9 w-auto min-w-[8rem]";

  return (
    <div className={stacked ? "space-y-3" : "flex flex-wrap gap-2"}>
      {activeTab === "opportunities" && (
        <Select value={category || "all"} onValueChange={(v) => setCategory(v === "all" ? "" : v)}>
          <SelectTrigger className={triggerClass}>
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {MARKETPLACE_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {MARKETPLACE_CATEGORY_LABELS[c] ?? c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {(activeTab === "managers" || activeTab === "opportunities") && (
        <>
          <Select
            value={securityRating || "all"}
            onValueChange={(v) => setSecurityRating(v === "all" ? "" : v)}
          >
            <SelectTrigger className={triggerClass}>
              <SelectValue placeholder="Security" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All security</SelectItem>
              {Object.entries(SECURITY_RATING_LABELS).map(([k, label]) => (
                <SelectItem key={k} value={k}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={aggressiveness || "all"}
            onValueChange={(v) => setAggressiveness(v === "all" ? "" : v)}
          >
            <SelectTrigger className={triggerClass}>
              <SelectValue placeholder="Risk level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All levels</SelectItem>
              {Object.entries(AGGRESSIVENESS_LABELS).map(([k, label]) => (
                <SelectItem key={k} value={k}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      )}

      {activeTab === "opportunities" && (
        <Select
          value={capacityStatus || "all"}
          onValueChange={(v) => setCapacityStatus(v === "all" ? "" : v)}
        >
          <SelectTrigger className={triggerClass}>
            <SelectValue placeholder="Capacity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All capacity</SelectItem>
            {Object.entries(CAPACITY_STATUS_LABELS).map(([k, label]) => (
              <SelectItem key={k} value={k}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {(activeTab === "strategies" || activeTab === "cycles") && (
        <Select value={riskProfile || "all"} onValueChange={(v) => setRiskProfile(v === "all" ? "" : v)}>
          <SelectTrigger className={triggerClass}>
            <SelectValue placeholder="Risk profile" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All risk profiles</SelectItem>
            {STRATEGY_RISK_PROFILES.map((r) => (
              <SelectItem key={r} value={r} className="capitalize">
                {r.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {activeTab === "cycles" && (
        <Select value={fundingStatus || "all"} onValueChange={(v) => setFundingStatus(v === "all" ? "" : v)}>
          <SelectTrigger className={triggerClass}>
            <SelectValue placeholder="Funding status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="funding">Actively funding</SelectItem>
            <SelectItem value="open">Open for commitment</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
