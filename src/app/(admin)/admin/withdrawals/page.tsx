import { redirect } from "next/navigation";
import { adminFinanceWithdrawalsPath } from "@/constants/routes";

export default function AdminWithdrawalsRedirectPage() {
  redirect(adminFinanceWithdrawalsPath("pending"));
}
