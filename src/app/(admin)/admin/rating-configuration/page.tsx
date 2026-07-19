import { AdminPageHeader } from "@/features/admin/components";
import { AdminPerformanceIntelligenceClient } from "@/features/performance-intelligence/components/performance-intelligence-panels";
import { managerRatingService } from "@/services/manager-rating.service";
import { ratingConfigurationService } from "@/services/rating-configuration.service";

export default async function AdminRatingConfigurationPage() {
  const [dashboard, config] = await Promise.all([
    managerRatingService.getAdminDashboard(),
    ratingConfigurationService.getActiveProfile(),
  ]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Rating Configuration"
        description="Manage configurable rating profile weights. All changes are audit-logged."
      />
      <AdminPerformanceIntelligenceClient
        dashboard={dashboard}
        profile={config?.profile ?? null}
        weights={config?.weights ?? []}
      />
    </div>
  );
}
