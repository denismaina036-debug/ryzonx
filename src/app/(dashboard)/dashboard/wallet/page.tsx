import Link from "next/link";
import { requireAuth } from "@/lib/auth/session";
import s from "@/features/trading/trading.module.css";
export default async function WalletPage() {
  await requireAuth();
  return <div className={s.surface}><h1 className={s.title}>Wallet</h1><p className={s.muted} style={{ margin: "16px 0 24px" }}>Manage your existing RyvonX funding account.</p><div className={s.grid}><Link className={s.card} href="/dashboard/deposits">Deposits →</Link><Link className={s.card} href="/dashboard/withdrawals">Withdrawals →</Link><Link className={s.card} href="/dashboard/transactions">Transaction history →</Link><Link className={s.card} href="/dashboard">Account overview →</Link></div><p className={s.muted} style={{ marginTop: 24 }}>Trading account funding is not available yet.</p></div>;
}
