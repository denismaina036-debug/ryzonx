import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { ROUTES } from "@/constants/routes";
import { marketplaceService } from "@/services/marketplace.service";
import { walletProjectionService } from "@/services/wallet-projection.service";
import { JoinPoolConfirmation } from "@/features/marketplace/components/join-pool-confirmation";
import { InvestorPageContent } from "@/components/layouts/investor-page-content";

export default async function JoinPoolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const pool = await marketplaceService.getPoolBySlug(slug);
  if (!pool) notFound();

  if (pool.capacityStatus === "closed" || pool.poolHealth === "suspended") {
    redirect(`${ROUTES.marketplace}/${slug}`);
  }

  const user = await getCurrentUser();
  let availableBalance = 0;

  if (user) {
    const projection = await walletProjectionService.getForInvestor(user.id);
    availableBalance = projection.available;
  }

  return (
    <InvestorPageContent className="py-1 pb-0 sm:py-4">
      <JoinPoolConfirmation
        pool={pool}
        isAuthenticated={!!user}
        availableBalance={availableBalance}
      />
    </InvestorPageContent>
  );
}
