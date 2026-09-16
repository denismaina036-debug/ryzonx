import { requireRole } from "@/lib/auth/session";
import { AdminTradingControls } from "@/features/trading/admin-controls";
export default async function TradingControlPage() { await requireRole("administrator"); return <AdminTradingControls />; }
