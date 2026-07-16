import Link from "next/link";
import { requireAuth } from "@/lib/auth/session";
import { challengeService } from "@/services/challenge.service";
import { poolManagerApplicationService } from "@/services/pool-manager-application.service";
import { ManagerJourneyView } from "@/features/investor/components/manager-journey-view";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";

export default async function ManagerJourneyPage() {
  await requireAuth();
  const [{ challenge, enrollment, availableBalance }, application] = await Promise.all([
    challengeService.getInvestorChallengeState(),
    poolManagerApplicationService.getMyApplication(),
  ]);

  if (!challenge) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] p-8 text-center shadow-[var(--id-shadow)]">
          <h1 className="text-xl font-semibold text-[var(--id-text)]">Manager Journey</h1>
          <p className="mt-2 text-[var(--id-text-muted)]">
            The Manager Journey program is not available at this time.
          </p>
          <Button asChild className="mt-6" variant="outline">
            <Link href={ROUTES.dashboard}>Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ManagerJourneyView
      challenge={challenge}
      enrollment={enrollment}
      availableBalance={availableBalance}
      application={application}
    />
  );
}
