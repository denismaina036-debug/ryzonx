import { notFound } from "next/navigation";
import { investmentCycleService } from "@/services/investment-cycle.service";
import { strategyService } from "@/services/strategy.service";
import { PmCycleDetailClient } from "@/features/pool-manager/components/workspace/pm-cycle-detail-client";

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

  const [strategy, strategies] = await Promise.all([
    strategyService.getById(cycle.strategyId),
    strategyService.listMine(),
  ]);

  return (
    <PmCycleDetailClient
      initialCycle={cycle}
      strategy={strategy}
      strategies={strategies}
    />
  );
}
