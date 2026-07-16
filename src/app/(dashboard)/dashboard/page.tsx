import { requireAuth } from "@/lib/auth/session";
import { investorService } from "@/services/investor.service";
import { InvestorDashboardView } from "@/features/investor";

export default async function InvestorDashboardPage() {
  const user = await requireAuth();
  const data = await investorService.getDashboardPageData();

  return <InvestorDashboardView user={user} data={data} />;
}
