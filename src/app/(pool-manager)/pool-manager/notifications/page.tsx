import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { notificationService } from "@/services/notification.service";

export default async function PoolManagerNotificationsPage() {
  const notifications = await notificationService.getInvestorNotifications();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Notifications</h1>
      {notifications.length === 0 ? (
        <p className="text-sm text-navy-500">No notifications.</p>
      ) : (
        <ul className="space-y-3">
          {notifications.map((n) => (
            <li
              key={n.id}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
            >
              <p className="font-medium text-white">{n.title}</p>
              <p className="mt-1 text-sm text-navy-400">{n.message}</p>
              <p className="mt-2 text-xs text-navy-600">
                {new Date(n.createdAt).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
      <Link href={ROUTES.poolManager} className="text-sm text-amber-300/80">
        ← Overview
      </Link>
    </div>
  );
}
