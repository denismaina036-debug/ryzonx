"use client";

import { TrendingUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InvestorTradeCard } from "@/features/investor/components/investor-trade-card";
import { RyvonxEmptyState, RyvonxPageHeader } from "@/features/investor/constants/ui";
import { tapTabTrigger } from "@/lib/ui/interaction";
import { cn } from "@/lib/utils";
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
      <RyvonxPageHeader
        title="Pool Trades"
        description="Trades recorded by pool managers in their trading journals across marketplace pools."
      />

      <Tabs defaultValue="running" className="w-full">
        <TabsList className="mb-4 h-auto w-full justify-start gap-6 rounded-none border-b border-[var(--id-border)] bg-transparent p-0">
          <TabsTrigger
            value="running"
            className={cn(
              tapTabTrigger,
              "rounded-none border-b-2 border-transparent bg-transparent px-0 pb-2.5 text-sm font-medium text-[var(--id-text-muted)] shadow-none data-[state=active]:border-[var(--id-accent)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--id-text)] data-[state=active]:shadow-none"
            )}
          >
            Running ({runningTrades.length})
          </TabsTrigger>
          <TabsTrigger
            value="closed"
            className={cn(
              tapTabTrigger,
              "rounded-none border-b-2 border-transparent bg-transparent px-0 pb-2.5 text-sm font-medium text-[var(--id-text-muted)] shadow-none data-[state=active]:border-[var(--id-accent)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--id-text)] data-[state=active]:shadow-none"
            )}
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
      <RyvonxEmptyState
        icon={<TrendingUp className="h-5 w-5" />}
        title={emptyLabel.replace(/\.$/, "")}
        description="Published pool trades from manager journals will appear here when managers record activity."
      />
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
