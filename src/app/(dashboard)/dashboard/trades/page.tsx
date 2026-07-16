import { requireAuth } from "@/lib/auth/session";
import { investorService } from "@/services/investor.service";
import { InvestorTradesView } from "@/features/investor/components/investor-trades-view";

export default async function InvestorTradesPage() {
  await requireAuth();
  const data = await investorService.getTradesPageData();

  return <InvestorTradesView data={data} />;
}
