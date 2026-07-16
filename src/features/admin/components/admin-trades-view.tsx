"use client";

import { AdminPageHeader } from "./admin-page-header";
import { AddTradeWizard } from "./add-trade-wizard";
import { TradesTable } from "./trades-table";
import type { AdminFund, AdminTrade } from "@/features/admin/types";

export function AdminTradesView({
  trades,
  funds,
}: {
  trades: AdminTrade[];
  funds: AdminFund[];
}) {
  return (
    <div>
      <AdminPageHeader
        title="Trades"
        description="Add trades to a pool, distribute profits to members, and attach TradingView screenshots."
        actions={<AddTradeWizard funds={funds} />}
      />
      <TradesTable trades={trades} />
    </div>
  );
}
