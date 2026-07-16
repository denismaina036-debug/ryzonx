import { AdminPageHeader } from "@/features/admin/components";
import { AdminManagerDevelopmentDetail } from "@/features/admin/components/admin-capital-growth-panels";
import { poolManagerGrowthService } from "@/services/pool-manager-growth.service";

export default async function AdminManagerDevelopmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let profile: Awaited<ReturnType<typeof poolManagerGrowthService.getDevelopmentProfile>> | null = null;
  try {
    profile = await poolManagerGrowthService.getDevelopmentProfile(id);
  } catch {
    profile = null;
  }

  if (!profile) {
    return (
      <div>
        <AdminPageHeader title="Manager Development" description="Manager not found." />
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader title="Manager Development" description="Committee evaluation and career progression." />
      <AdminManagerDevelopmentDetail profile={profile} />
    </div>
  );
}
