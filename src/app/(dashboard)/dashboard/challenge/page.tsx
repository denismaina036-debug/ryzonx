import { redirect } from "next/navigation";
import { ROUTES } from "@/constants/routes";

/** Legacy route — redirects to Manager Journey */
export default function ChallengeRedirectPage() {
  redirect(ROUTES.managerJourney);
}
