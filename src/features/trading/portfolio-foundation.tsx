"use client";
import { copyTradingText } from "@/lib/copy-trading-presentation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/providers/auth-provider";
import type { VirtualAccount } from "@/services/trading/virtual-account";
import { priceLabel, EmptyState } from "./market-components";
import s from "./trading.module.css";

export function TradingPortfolio() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["trading", "virtual-account", user?.id], enabled: !!user,
    gcTime: 0, retry: false,
    queryFn: async (): Promise<{ account: VirtualAccount }> => {
      const response = await fetch("/api/trading/virtual-account", { cache: "no-store" });
      if (!response.ok) throw new Error("Virtual account unavailable. Please try again shortly.");
      return response.json();
    },
  });
  return <div className={s.surface}>
    <div className={s.top}><h1 className={s.title}>Trading Portfolio</h1><span className={s.badge}>Simulation</span><Link className={s.button} href="/dashboard/discover">Explore markets</Link></div>
    <p className={s.notice}>Virtual money for practice, strategy testing and market tracking. It is separate from your real funds and cannot be deposited or withdrawn.</p>
    {!user ? <EmptyState>Sign in to view your virtual account.</EmptyState> : query.isPending ? <EmptyState>Loading virtual account…</EmptyState> : query.error ? <EmptyState>{copyTradingText(query.error.message)}<button className={s.button} onClick={() => query.refetch()}>Retry</button></EmptyState> : <dl className={s.stats}><div><dt>Virtual Cash</dt><dd>${priceLabel(query.data.account.cash_usd)} <span className={s.muted}>USD</span></dd></div></dl>}
    <p className={s.muted}>Existing copy allocations remain in <Link href="/dashboard/portfolio">Copy Activity</Link>.</p>
  </div>;
}
