import { createAdminClient } from "@/lib/supabase/admin";
import { appUrl } from "@/lib/app-url";

function formatMoney(amount: number | string): string {
  const n = typeof amount === "number" ? amount : Number(amount);
  if (Number.isNaN(n)) return String(amount);
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export { formatMoney };

export async function buildUserCommunicationVariables(
  userId: string,
  extra: Record<string, string | number | boolean | null | undefined> = {}
): Promise<Record<string, string>> {
  const db = createAdminClient();
  const { data } = await db
    .from("profiles")
    .select("full_name, email")
    .eq("id", userId)
    .maybeSingle();

  const profile = data as { full_name?: string; email?: string } | null;
  const fullName = profile?.full_name?.trim() ?? "";
  const nameParts = fullName.split(/\s+/).filter(Boolean);

  const base: Record<string, string> = {
    first_name: nameParts[0] ?? "there",
    last_name: nameParts.slice(1).join(" "),
    fullName: fullName || "Investor",
    dashboard_link: appUrl("/dashboard"),
    preferences_url: appUrl("/dashboard/settings"),
    unsubscribe_url: appUrl("/dashboard/settings"),
  };

  for (const [key, value] of Object.entries(extra)) {
    if (value != null) base[key] = String(value);
  }

  return base;
}
