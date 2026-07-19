import { managerRatingService } from "@/services/manager-rating.service";
import { PmPerformanceDashboard } from "@/features/pool-manager/components/performance/pm-performance-dashboard";

export default async function PoolManagerPerformancePage() {
  const [rating, bundle] = await Promise.all([
    managerRatingService.getForCurrentManager(),
    managerRatingService.getPerformanceBundleForCurrentManager(),
  ]);

  return <PmPerformanceDashboard rating={rating} bundle={bundle} />;
}
