import { requireAuth } from "@/lib/auth/session";
import { Discover } from "@/features/trading/discover";
export default async function DiscoverPage() { await requireAuth(); return <Discover />; }
