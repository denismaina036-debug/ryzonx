import { AdminManagerDevelopmentDetail } from "@/features/admin/components/admin-capital-growth-panels";
import { AdminPoolManagersShell } from "@/features/admin/components/admin-pool-managers-shell";
import { poolManagerGrowthService } from "@/services/pool-manager-growth.service";

export default async function AdminPoolManagersDevelopmentDetailPage({
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
      <AdminPoolManagersShell
        title="Manager Development"
        description="Manager not found."
      >
        <p className="text-sm text-navy-500">This manager profile could not be loaded.</p>
      </AdminPoolManagersShell>
    );
  }

  return (
    <AdminPoolManagersShell
      title="Manager Development"
      description="Committee evaluation and career progression."
    >
      <AdminManagerDevelopmentDetail profile={profile} />
    </AdminPoolManagersShell>
  );
}
