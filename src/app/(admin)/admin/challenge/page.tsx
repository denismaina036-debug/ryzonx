import { AdminPageHeader } from "@/features/admin/components";
import { AdminChallengeEnrollments } from "@/features/admin/components/admin-challenge-enrollments";
import { challengeService } from "@/services/challenge.service";

export default async function AdminChallengePage() {
  const enrollments = await challengeService.getAdminEnrollments();

  return (
    <div>
      <AdminPageHeader
        title="Trader Challenge"
        description="Send challenge account credentials and rules to investors who have paid."
      />
      <AdminChallengeEnrollments enrollments={enrollments} />
    </div>
  );
}
