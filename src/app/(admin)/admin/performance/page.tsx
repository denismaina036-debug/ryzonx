import { AdminPageHeader } from "@/features/admin/components";
import { AdminPerformanceIntelligenceClient } from "@/features/performance-intelligence/components/performance-intelligence-panels";
import { managerRatingService } from "@/services/manager-rating.service";
import { ratingConfigurationService } from "@/services/rating-configuration.service";

export default async function AdminPerformancePage() {
  const [dashboard, config] = await Promise.all([
    managerRatingService.getAdminDashboard(),
    ratingConfigurationService.getActiveProfile(),
  ]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Performance Intelligence"
        description="Platform ratings, governance rankings, operational alerts, and configurable rating weights."
      />
      <AdminPerformanceIntelligenceClient
        dashboard={dashboard}
        profile={config?.profile ?? null}
        weights={config?.weights ?? []}
      />
    </div>
  );
}
