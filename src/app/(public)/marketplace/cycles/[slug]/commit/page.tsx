import { redirect, notFound } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { createAdminClient } from "@/lib/supabase/admin";
import { investmentCycleService } from "@/services/investment-cycle.service";

export default async function MarketplaceCycleCommitRedirectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cycle = await investmentCycleService.getPublicBySlug(slug);
  if (!cycle) notFound();

  if (cycle.fundId) {
    const db = createAdminClient();
    const { data: fund } = await db
      .from("funds")
      .select("slug")
      .eq("id", cycle.fundId)
      .maybeSingle();
    const poolSlug = (fund as { slug?: string } | null)?.slug;
    if (poolSlug) {
      redirect(`${ROUTES.marketplace}/${poolSlug}/join`);
    }
  }

  redirect(ROUTES.marketplace);
}
