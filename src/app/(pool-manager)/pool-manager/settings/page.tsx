import Link from "next/link";
import { ROUTES } from "@/constants/routes";

export default function PoolManagerSettingsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">Settings</h1>
      <p className="text-sm text-navy-400">
        Account settings are shared with your investor profile.
      </p>
      <Link
        href={ROUTES.settings}
        className="inline-block text-sm text-amber-300 hover:text-amber-200"
      >
        Open investor account settings →
      </Link>
    </div>
  );
}
