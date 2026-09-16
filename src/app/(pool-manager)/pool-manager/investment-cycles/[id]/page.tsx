import { notFound } from "next/navigation";
import { investmentCycleService } from "@/services/investment-cycle.service";
import { strategyService } from "@/services/strategy.service";
import { PmCycleDetailClient } from "@/features/pool-manager/components/workspace/pm-cycle-detail-client";
import { platformInvestmentLevelService } from "@/services/platform-investment-level.service";

export default async function PoolManagerCycleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let cycle;
  try {
    cycle = await investmentCycleService.getByIdForManager(id);
  } catch {
    notFound();
  }

  const [strategy, strategies, investmentLevels] = await Promise.all([
    strategyService.getById(cycle.strategyId),
    strategyService.listMine(),
    platformInvestmentLevelService.listActive(),
  ]);

  return (
    <PmCycleDetailClient
      initialCycle={cycle}
      strategy={strategy}
      strategies={strategies}
      investmentLevels={investmentLevels}
    />
  );
}
