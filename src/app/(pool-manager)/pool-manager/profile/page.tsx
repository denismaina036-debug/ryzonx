import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { parsePmSocialLinks } from "@/domain/pool-manager/public-profile";
import {
  PoolManagerProfileEditor,
  type PoolManagerProfileEditorData,
} from "@/features/pool-manager/components/profile-editor";
import { pmSubtitleClass, pmTitleClass } from "@/features/pool-manager/constants/ui";

export default async function PoolManagerProfilePage() {
  const user = await requireRole(USER_ROLES.POOL_MANAGER);
  const db = createAdminClient();
  const { data } = await db
    .from("pool_managers")
    .select(
      "bio, trading_style, markets, slug, username, show_full_name, social_links, profile_photo_url, icon_url, display_name"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  const row = data as {
    bio?: string | null;
    trading_style?: string | null;
    markets?: string[] | null;
    slug?: string | null;
    username?: string | null;
    show_full_name?: boolean | null;
    social_links?: unknown;
    profile_photo_url?: string | null;
    icon_url?: string | null;
    display_name?: string | null;
  } | null;

  const avatarUrl = user.avatarUrl ?? row?.profile_photo_url ?? row?.icon_url ?? null;
  const slug = row?.slug ?? "";
  const username = row?.username ?? slug;

  const initial: PoolManagerProfileEditorData = {
    fullName: row?.display_name ?? user.fullName,
    username,
    slug,
    showFullName: Boolean(row?.show_full_name),
    avatarUrl,
    bio: row?.bio ?? "",
    tradingStyle: row?.trading_style ?? "",
    markets: (row?.markets ?? []).join(", "),
    socialLinks: parsePmSocialLinks(row?.social_links),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className={pmTitleClass}>Public Profile</h1>
        <p className={pmSubtitleClass}>
          Manage how investors see you on RyvonX — your username, visibility, and social links.
        </p>
      </div>
      <PoolManagerProfileEditor initial={initial} />
    </div>
  );
}
