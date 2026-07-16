"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InvestorTradeCard } from "@/features/investor/components/investor-trade-card";
import type { InvestorDashboardTrade } from "@/features/investor/types";

export interface InvestorTradesPageData {
  runningTrades: InvestorDashboardTrade[];
  closedTrades: InvestorDashboardTrade[];
}

interface InvestorTradesViewProps {
  data: InvestorTradesPageData;
}

export function InvestorTradesView({ data }: InvestorTradesViewProps) {
  const { runningTrades, closedTrades } = data;

  return (
    <div className="mx-auto w-full min-w-0 max-w-[960px] space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--id-text)] sm:text-[1.75rem]">
          Pool Trades
        </h1>
        <p className="mt-1.5 text-sm text-[var(--id-text-secondary)]">
          Live and closed trades published by pool managers and approved by RyvonX admin.
        </p>
      </div>

      <Tabs defaultValue="running" className="w-full">
        <TabsList className="mb-4 h-auto w-full justify-start gap-6 rounded-none border-b border-[var(--id-border)] bg-transparent p-0">
          <TabsTrigger
            value="running"
            className="rounded-none border-b-2 border-transparent bg-transparent px-0 pb-2.5 text-sm font-medium text-[var(--id-text-muted)] shadow-none transition-colors data-[state=active]:border-[var(--id-accent)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--id-text)] data-[state=active]:shadow-none"
          >
            Running ({runningTrades.length})
          </TabsTrigger>
          <TabsTrigger
            value="closed"
            className="rounded-none border-b-2 border-transparent bg-transparent px-0 pb-2.5 text-sm font-medium text-[var(--id-text-muted)] shadow-none transition-colors data-[state=active]:border-[var(--id-accent)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--id-text)] data-[state=active]:shadow-none"
          >
            Closed ({closedTrades.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="running" className="mt-0">
          <TradesList trades={runningTrades} emptyLabel="No running pool trades right now." />
        </TabsContent>
        <TabsContent value="closed" className="mt-0">
          <TradesList trades={closedTrades} emptyLabel="No closed pool trades yet." />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TradesList({
  trades,
  emptyLabel,
}: {
  trades: InvestorDashboardTrade[];
  emptyLabel: string;
}) {
  if (trades.length === 0) {
    return (
      <div className="rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] px-6 py-14 text-center shadow-[var(--id-shadow)]">
        <p className="text-sm text-[var(--id-text-muted)]">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {trades.map((trade) => (
        <InvestorTradeCard key={trade.id} trade={trade} />
      ))}
    </div>
  );
}
