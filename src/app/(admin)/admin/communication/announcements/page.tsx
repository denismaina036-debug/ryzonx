import { CommunicationCenterShell } from "@/features/admin/components/communication-center/communication-center-shell";
import { AdminCommunicationAnnouncementsView } from "@/features/admin/components/communication-center/admin-communication-announcements-view";
import { announcementCenterService } from "@/services/communication";

export default async function AdminCommunicationAnnouncementsPage() {
  let announcements: Awaited<ReturnType<typeof announcementCenterService.list>> = [];
  try {
    announcements = await announcementCenterService.list();
  } catch {
    announcements = [];
  }

  return (
    <CommunicationCenterShell
      title="Announcements"
      description="Create and publish platform announcements — maintenance, updates, security notices, and feature releases."
    >
      <AdminCommunicationAnnouncementsView initialAnnouncements={announcements} />
    </CommunicationCenterShell>
  );
}
