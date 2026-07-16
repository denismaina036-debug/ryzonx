import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionContainer, SectionHeader } from "@/components/layouts/section";
import { Button } from "@/components/ui/button";
import { ActivityFeed } from "@/components/ui/activity-feed";
import { ROUTES } from "@/constants/routes";
import { fundService } from "@/services/fund.service";

export async function ActivitySections() {
  const [deposits, withdrawals] = await Promise.all([
    fundService.getRecentDeposits(),
    fundService.getRecentWithdrawals(),
  ]);

  return (
    <SectionContainer className="bg-surface-1">
      <SectionHeader
        badge="Live Activity"
        title="Recent Fund Activity"
        description="Real-time deposits and withdrawals. All investor names are anonymized for privacy."
        align="center"
      />
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h3 className="mb-4 text-lg font-semibold text-navy-950">
            Recent Deposits
          </h3>
          <ActivityFeed items={deposits} type="deposit" />
        </div>
        <div>
          <h3 className="mb-4 text-lg font-semibold text-navy-950">
            Recent Withdrawals
          </h3>
          <ActivityFeed items={withdrawals} type="withdrawal" />
        </div>
      </div>
      <div className="mt-8 flex justify-center">
        <Button asChild variant="outline">
          <Link href={ROUTES.activity}>
            View all transactions
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </SectionContainer>
  );
}
