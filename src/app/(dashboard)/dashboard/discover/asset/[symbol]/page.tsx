import { requireAuth } from "@/lib/auth/session";
import { AssetDetail } from "@/features/trading/asset-detail";
export default async function AssetPage({ params }: { params: Promise<{ symbol: string }> }) {
  await requireAuth(); const { symbol } = await params; return <AssetDetail symbol={symbol} />;
}
