import { redirect } from "next/navigation";
import { adminFinanceDepositsPath } from "@/constants/routes";

export default function AdminDepositsRedirectPage() {
  redirect(adminFinanceDepositsPath("pending"));
}
