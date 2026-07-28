import { notFound } from "next/navigation";
import { transactionService } from "@/services/transaction.service";
import { InvestorTransactionDetailView } from "@/features/investor/components/investor-transaction-detail-view";

export default async function TransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const transaction = await transactionService.getInvestorTransactionById(id);

  if (!transaction) {
    notFound();
  }

  return <InvestorTransactionDetailView transaction={transaction} />;
}
