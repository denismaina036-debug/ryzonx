import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { PoolManagerProfileEditor } from "@/features/pool-manager/components/profile-editor";

export default async function PoolManagerProfilePage() {
  const user = await requireRole(USER_ROLES.POOL_MANAGER);
  const db = createAdminClient();
  const { data } = await db
    .from("pool_managers")
    .select("bio, trading_style, markets, slug, profile_photo_url, icon_url")
    .eq("user_id", user.id)
    .maybeSingle();

  const row = data as {
    bio?: string | null;
    trading_style?: string | null;
    markets?: string[] | null;
    slug?: string | null;
    profile_photo_url?: string | null;
    icon_url?: string | null;
  } | null;

  const avatarUrl =
    user.avatarUrl ?? row?.profile_photo_url ?? row?.icon_url ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Public Profile</h1>
        <p className="mt-2 text-sm text-navy-400">
          Manage how investors see you on RyvonX.
          {row?.slug && (
            <>
              {" "}
              Public URL: /managers/{row.slug}
            </>
          )}
        </p>
      </div>
      <PoolManagerProfileEditor
        displayName={user.fullName}
        initialAvatarUrl={avatarUrl}
        initialBio={row?.bio ?? ""}
        initialTradingStyle={row?.trading_style ?? ""}
        initialMarkets={(row?.markets ?? []).join(", ")}
      />
    </div>
  );
}
