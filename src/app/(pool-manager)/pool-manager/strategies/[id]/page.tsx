import { notFound } from "next/navigation";
import { strategyService } from "@/services/strategy.service";
import { investmentCycleService } from "@/services/investment-cycle.service";
import { PmStrategyDetailClient } from "@/features/pool-manager/components/workspace/pm-strategy-detail-client";

export default async function PoolManagerStrategyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let strategy;
  try {
    strategy = await strategyService.getByIdForManager(id);
  } catch {
    notFound();
  }

  const cycles = await investmentCycleService.listByStrategy(id);

  return <PmStrategyDetailClient initialStrategy={strategy} initialCycles={cycles} />;
}
