import { redirect } from "next/navigation";
import { ROUTES } from "@/constants/routes";

export default function PoolManagerPoolsPage() {
  redirect(ROUTES.poolManager);
}
