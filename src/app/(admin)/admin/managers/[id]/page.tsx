import { notFound } from "next/navigation";
import { AdminAdministrationShell } from "@/features/admin/components/admin-administration-shell";
import { AdminManagerOversightClient } from "@/features/admin/components/admin-manager-oversight-client";
import { adminManagerOversightService } from "@/services/admin-manager-oversight.service";

export default async function AdminManagerOversightPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let profile: Awaited<ReturnType<typeof adminManagerOversightService.getProfile>> | null = null;
  try {
    profile = await adminManagerOversightService.getProfile(id);
  } catch {
    profile = null;
  }

  if (!profile) notFound();

  return (
    <AdminAdministrationShell
      title="Manager Oversight"
      description="Professional manager profile with strategies, cycles, governance history, and internal notes."
    >
      <AdminManagerOversightClient profile={profile} />
    </AdminAdministrationShell>
  );
}
