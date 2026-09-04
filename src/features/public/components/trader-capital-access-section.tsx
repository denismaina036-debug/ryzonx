import { pmAdmissionTierService } from "@/services/pm-admission-tier.service";
import { TraderCapitalAccessGrid } from "./trader-capital-access-grid";
import { withTimeout } from "@/lib/async/with-timeout";

export async function TraderCapitalAccessSection() {
  const tiers = await withTimeout(
    pmAdmissionTierService.listPublic(),
    1_500,
    "Public capital tiers timed out"
  ).catch(() => []);
  if (tiers.length === 0) return null;
  return <TraderCapitalAccessGrid tiers={tiers} />;
}
