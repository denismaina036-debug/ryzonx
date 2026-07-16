import Link from "next/link";
import { ROUTES } from "@/constants/routes";

export default function PoolManagerJournalPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">Trading Journal</h1>
      <p className="text-sm text-navy-400">
        Your trading journal entries linked to managed pools will be shown here.
      </p>
      <Link href={ROUTES.poolManager} className="text-sm text-amber-300/80">
        ← Overview
      </Link>
    </div>
  );
}
