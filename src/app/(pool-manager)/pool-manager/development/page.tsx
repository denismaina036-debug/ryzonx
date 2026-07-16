import { poolManagerGrowthService } from "@/services/pool-manager-growth.service";
import { PmDevelopmentView } from "@/features/pool-manager/components/pm-development-view";

export default async function PoolManagerDevelopmentPage() {
  const summary = await poolManagerGrowthService.getMyDevelopmentSummary();

  if (!summary) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Manager Development</h1>
        <p className="mt-2 text-sm text-navy-500">Pool manager profile not found.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy-900">Manager Development</h1>
      <p className="mt-1 text-sm text-navy-500">
        Track your career progression and submit content for RyvonX approval.
      </p>
      <div className="mt-8">
        <PmDevelopmentView summary={summary} />
      </div>
    </div>
  );
}
