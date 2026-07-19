import { AdminChallengeReview } from "@/features/admin/components/admin-challenge-review";
import { AdminPoolManagersShell } from "@/features/admin/components/admin-pool-managers-shell";
import { challengeCenterService } from "@/services/challenge-center.service";

export default async function AdminChallengeReviewPage({
  params,
}: {
  params: Promise<{ enrollmentId: string }>;
}) {
  const { enrollmentId } = await params;
  const state = await challengeCenterService.getAdminReviewState(enrollmentId);

  return (
    <AdminPoolManagersShell
      title="Challenge Review"
      description="Review submitted trades, challenge statistics, and mark the challenge outcome."
    >
      <AdminChallengeReview initialState={state} />
    </AdminPoolManagersShell>
  );
}
