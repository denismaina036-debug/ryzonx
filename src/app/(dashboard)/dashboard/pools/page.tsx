import { redirect } from "next/navigation";
import { ROUTES } from "@/constants/routes";

/** Pools are browsed via Marketplace — keep route for backwards compatibility. */
export default function PoolsPage() {
  redirect(ROUTES.marketplace);
}
