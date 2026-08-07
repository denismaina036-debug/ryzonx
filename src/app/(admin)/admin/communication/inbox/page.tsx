import { redirect } from "next/navigation";
import { ROUTES } from "@/constants/routes";

export default function AdminCommunicationInboxRedirectPage() {
  redirect(ROUTES.adminCommunicationSupport);
}
