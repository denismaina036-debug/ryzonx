"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MARKETPLACE_CATEGORIES,
  MARKETPLACE_CATEGORY_LABELS,
  MARKETPLACE_SORT_OPTIONS,
  AGGRESSIVENESS_LABELS,
  SECURITY_RATING_LABELS,
  CAPACITY_STATUS_LABELS,
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
import { MarketplacePoolCardView } from "@/features/marketplace/components/marketplace-pool-card";
import type {
  FeaturedMarketplaceSection,
  MarketplacePoolCard,
} from "@/domain/marketplace/types";

interface MarketplaceBrowseProps {
  initialPools: MarketplacePoolCard[];
  featuredSections: FeaturedMarketplaceSection[];
}

export function MarketplaceBrowse({
  initialPools,
  featuredSections,
}: MarketplaceBrowseProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("best_rated");
  const [securityRating, setSecurityRating] = useState("");
  const [aggressiveness, setAggressiveness] = useState("");
  const [capacityStatus, setCapacityStatus] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filteredPools = useMemo(() => {
    let pools = [...initialPools];
    const q = search.trim().toLowerCase();

    if (q) {
      pools = pools.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.managerName?.toLowerCase().includes(q) ?? false)
      );
    }
    if (category) pools = pools.filter((p) => p.categories.includes(category));
    if (securityRating) pools = pools.filter((p) => p.securityRating === securityRating);
    if (aggressiveness) pools = pools.filter((p) => p.aggressivenessLevel === aggressiveness);
    if (capacityStatus) pools = pools.filter((p) => p.capacityStatus === capacityStatus);

    switch (sort) {
      case "highest_return":
        pools.sort((a, b) => b.overallReturnPct - a.overallReturnPct);
        break;
      case "most_investors":
        pools.sort((a, b) => b.activeInvestors - a.activeInvestors);
        break;
      case "highest_aum":
        pools.sort((a, b) => b.assetsUnderManagement - a.assetsUnderManagement);
        break;
      case "newest":
        pools.sort(
          (a, b) =>
            new Date(b.listedAt ?? 0).getTime() - new Date(a.listedAt ?? 0).getTime()
        );
        break;
      default:
        pools.sort((a, b) => (b.ryvonxRating ?? 0) - (a.ryvonxRating ?? 0));
    }

    return pools;
  }, [initialPools, search, category, sort, securityRating, aggressiveness, capacityStatus]);

  return (
    <div className="space-y-12">
      <section className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--id-accent-text)]">
          Marketplace / Pools
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--id-text)] sm:text-4xl lg:text-5xl">
          Discover professionally managed pools
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-[var(--id-text-secondary)]">
          Compare pools using objective data — manager verification, standardized ratings,
          and transparent performance. Invest because you trust the manager.
        </p>
      </section>

      {featuredSections.slice(0, 3).map((section) => (
        <section key={section.key}>
          <h2 className="mb-4 text-lg font-semibold text-[var(--id-text)]">{section.title}</h2>
          <div className="flex gap-4 overflow-x-auto pb-2 snap-x">
            {section.pools.map((pool) => (
              <div key={pool.id} className="w-[min(320px,85vw)] shrink-0 snap-start">
                <MarketplacePoolCardView pool={pool} compact />
              </div>
            ))}
          </div>
        </section>
      ))}

      <section>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--id-text-faint)]" />
            <Input
              placeholder="Search pools or managers…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {MARKETPLACE_SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            className="lg:hidden"
            onClick={() => setFiltersOpen(true)}
          >
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Filters
          </Button>
        </div>

        <div className="mt-4 hidden flex-wrap gap-2 lg:flex">
          <FilterPills
            category={category}
            setCategory={setCategory}
            securityRating={securityRating}
            setSecurityRating={setSecurityRating}
            aggressiveness={aggressiveness}
            setAggressiveness={setAggressiveness}
            capacityStatus={capacityStatus}
            setCapacityStatus={setCapacityStatus}
          />
        </div>

        <AnimatePresence>
          {filtersOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm lg:hidden"
                onClick={() => setFiltersOpen(false)}
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="fixed inset-x-0 bottom-0 z-50 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-background p-6 shadow-2xl lg:hidden"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold text-[var(--id-text)]">Filters</h3>
                  <button type="button" onClick={() => setFiltersOpen(false)}>
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <FilterPills
                  category={category}
                  setCategory={setCategory}
                  securityRating={securityRating}
                  setSecurityRating={setSecurityRating}
                  aggressiveness={aggressiveness}
                  setAggressiveness={setAggressiveness}
                  capacityStatus={capacityStatus}
                  setCapacityStatus={setCapacityStatus}
                  stacked
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <p className="mt-6 text-sm text-[var(--id-text-muted)]">
          {filteredPools.length} pool{filteredPools.length !== 1 ? "s" : ""} available
        </p>

        <div className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {filteredPools.map((pool) => (
            <MarketplacePoolCardView key={pool.id} pool={pool} />
          ))}
        </div>

        {filteredPools.length === 0 && (
          <p className="py-16 text-center text-[var(--id-text-faint)]">
            No pools match your filters. Try adjusting your search.
          </p>
        )}
      </section>
    </div>
  );
}

function FilterPills({
  category,
  setCategory,
  securityRating,
  setSecurityRating,
  aggressiveness,
  setAggressiveness,
  capacityStatus,
  setCapacityStatus,
  stacked = false,
}: {
  category: string;
  setCategory: (v: string) => void;
  securityRating: string;
  setSecurityRating: (v: string) => void;
  aggressiveness: string;
  setAggressiveness: (v: string) => void;
  capacityStatus: string;
  setCapacityStatus: (v: string) => void;
  stacked?: boolean;
}) {
  const wrapper = stacked ? "space-y-4" : "contents";

  return (
    <div className={wrapper}>
      <Select value={category || "all"} onValueChange={(v) => setCategory(v === "all" ? "" : v)}>
        <SelectTrigger className={stacked ? "w-full" : "w-40"}>
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

      <Select
        value={securityRating || "all"}
        onValueChange={(v) => setSecurityRating(v === "all" ? "" : v)}
      >
        <SelectTrigger className={stacked ? "w-full" : "w-36"}>
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
        <SelectTrigger className={stacked ? "w-full" : "w-40"}>
          <SelectValue placeholder="Aggressiveness" />
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

      <Select
        value={capacityStatus || "all"}
        onValueChange={(v) => setCapacityStatus(v === "all" ? "" : v)}
      >
        <SelectTrigger className={stacked ? "w-full" : "w-36"}>
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
    </div>
  );
}
