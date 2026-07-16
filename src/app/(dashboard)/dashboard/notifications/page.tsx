import { notificationService } from "@/services/notification.service";
import { InvestorNotificationsView } from "@/features/investor/components/investor-notifications-view";

export default async function NotificationsPage() {
  const notifications = await notificationService.getInvestorNotifications();
  return <InvestorNotificationsView notifications={notifications} />;
}
