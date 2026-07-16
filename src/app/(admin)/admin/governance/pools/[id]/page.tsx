import Link from "next/link";
import { AdminPageHeader } from "@/features/admin/components";
import { AdminGovernancePoolPanel } from "@/features/admin/components/admin-governance-pool-panel";
import { poolGovernanceService } from "@/services/pool-governance.service";
import { ROUTES } from "@/constants/routes";

export default async function AdminGovernancePoolPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let detail: Awaited<ReturnType<typeof poolGovernanceService.getPoolDetail>> | null = null;

  try {
    detail = await poolGovernanceService.getPoolDetail(id);
  } catch {
    detail = null;
  }

  if (!detail) {
    return (
      <div>
        <AdminPageHeader title="Pool Governance" description="Pool not found." />
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader
        title={detail.pool.name}
        description="Governance controls, monitoring metrics, and committee review history."
      />
      <Link
        href={ROUTES.adminGovernance}
        className="mb-6 inline-block text-sm text-royal-600 hover:underline"
      >
        ← Back to governance dashboard
      </Link>
      <AdminGovernancePoolPanel detail={detail} />
    </div>
  );
}
