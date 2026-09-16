import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth/session";
import { ASSET_CLASSES, type AssetClass } from "@/domain/trading/models";
import { Discover } from "@/features/trading/discover";
export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  await requireAuth();
  const { category } = await params;
  if (category === "futures" || !ASSET_CLASSES.includes(category as AssetClass)) notFound();
  return <Discover key={category} category={category as AssetClass} />;
}
