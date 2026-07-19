import { redirect } from "next/navigation";
import { adminPoolManagersApplicationsPath } from "@/constants/routes";

export default function AdminPoolManagerApplicationsRedirectPage() {
  redirect(adminPoolManagersApplicationsPath("pending"));
}
