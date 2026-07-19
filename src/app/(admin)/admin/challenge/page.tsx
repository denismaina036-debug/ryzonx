import { redirect } from "next/navigation";
import { ROUTES } from "@/constants/routes";

export default function AdminChallengeRedirectPage() {
  redirect(ROUTES.adminPoolManagersChallenges);
}
