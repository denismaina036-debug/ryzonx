import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { DEFAULT_FUND_ID } from "@/constants/funds";
import { ROUTES } from "@/constants/routes";
import { createAdminClient } from "@/lib/supabase/admin";
import { marketplaceService } from "@/services/marketplace.service";
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
    const db = createAdminClient();
    const { data } = await db
      .from("investor_portfolios")
      .select("available_balance")
      .eq("user_id", user.id)
      .eq("fund_id", DEFAULT_FUND_ID)
      .maybeSingle();
    availableBalance = Number((data as { available_balance?: number } | null)?.available_balance ?? 0);
  }

  return (
    <InvestorPageContent className="py-1 sm:py-4">
      <JoinPoolConfirmation
        pool={pool}
        isAuthenticated={!!user}
        availableBalance={availableBalance}
      />
    </InvestorPageContent>
  );
}
