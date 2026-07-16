import { supportService } from "@/services/support.service";
import { InvestorSupportView } from "@/features/investor/components/investor-support-view";

export default async function InvestorSupportPage() {
  const tickets = await supportService.getInvestorTickets();
  return <InvestorSupportView tickets={tickets} />;
}
