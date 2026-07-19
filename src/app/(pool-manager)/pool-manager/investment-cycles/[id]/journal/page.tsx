import { notFound } from "next/navigation";
import { investmentCycleService } from "@/services/investment-cycle.service";
import { PmJournalWorkspace } from "@/features/pool-manager/components/journal/pm-journal-workspace";

export default async function PoolManagerCycleJournalPage({
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

  return <PmJournalWorkspace cycle={cycle} />;
}
