import { requireAuth } from "@/lib/auth/session";
import { TradingPortfolio } from "@/features/trading/portfolio-foundation";
export default async function PortfolioPage() { await requireAuth(); return <TradingPortfolio />; }
