import { redirect } from "next/navigation";
import { ROUTES } from "@/constants/routes";

export default function AdminCommunicationSettingsRedirectPage() {
  redirect(ROUTES.adminCommunicationDashboard);
}
