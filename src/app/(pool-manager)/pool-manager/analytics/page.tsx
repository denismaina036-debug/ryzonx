import Link from "next/link";
import { ROUTES } from "@/constants/routes";

export default function PoolManagerAnalyticsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">Analytics</h1>
      <p className="text-sm text-navy-400">
        Pool performance analytics will appear here as your live pools accumulate data.
      </p>
      <Link href={ROUTES.poolManager} className="text-sm text-amber-300/80">
        ← Overview
      </Link>
    </div>
  );
}
