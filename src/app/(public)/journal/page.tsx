import { redirect } from "next/navigation";
import { ROUTES } from "@/constants/routes";

export default async function JournalPage() {
  redirect(ROUTES.trades);
}
