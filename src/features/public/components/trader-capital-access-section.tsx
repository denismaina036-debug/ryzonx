import { pmAdmissionTierService } from "@/services/pm-admission-tier.service";
import { TraderCapitalAccessGrid } from "./trader-capital-access-grid";

export async function TraderCapitalAccessSection() {
  const tiers = await pmAdmissionTierService.listPublic();
  if (tiers.length === 0) return null;
  return <TraderCapitalAccessGrid tiers={tiers} />;
}
