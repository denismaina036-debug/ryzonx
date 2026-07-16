import { transactionService } from "@/services/transaction.service";
import { InvestorTransactionsView } from "@/features/investor/components/investor-transactions-view";

export default async function TransactionsPage() {
  const transactions = await transactionService.getInvestorTransactions();

  return <InvestorTransactionsView transactions={transactions} />;
}
