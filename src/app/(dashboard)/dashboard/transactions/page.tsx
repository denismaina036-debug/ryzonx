import { transactionService } from "@/services/transaction.service";
import { investorService } from "@/services/investor.service";
import { InvestorTransactionsView } from "@/features/investor/components/investor-transactions-view";

export default async function TransactionsPage() {
  const [transactions, tradeData] = await Promise.all([
    transactionService.getInvestorTransactions(),
    investorService.getTradesPageData(),
  ]);

  return <InvestorTransactionsView transactions={transactions} trades={tradeData.recentTrades} />;
}
