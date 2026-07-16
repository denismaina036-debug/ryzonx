import { fundService } from "@/services/fund.service";
import { TransactionTicker } from "@/components/ui/transaction-ticker";

export async function RecentTransactionsTicker() {
  const transactions = await fundService.getRecentTransactions(undefined, 5);

  return <TransactionTicker items={transactions} />;
}
