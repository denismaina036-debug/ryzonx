import { investmentCycleService } from "@/services/investment-cycle.service";
import { PmCyclesClient } from "@/features/pool-manager/components/workspace/pm-cycles-client";

export default async function PoolManagerInvestmentCyclesPage() {
  const cycles = await investmentCycleService.listMine();
  return <PmCyclesClient initialCycles={cycles} />;
}
