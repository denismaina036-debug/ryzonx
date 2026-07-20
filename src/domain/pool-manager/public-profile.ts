export const PM_SOCIAL_PLATFORMS = [
  { key: "website", label: "Website", placeholder: "https://your-site.com" },
  { key: "twitter", label: "X (Twitter)", placeholder: "https://x.com/username" },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/in/username" },
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/username" },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@channel" },
  { key: "telegram", label: "Telegram", placeholder: "https://t.me/username" },
] as const;

export type PmSocialPlatformKey = (typeof PM_SOCIAL_PLATFORMS)[number]["key"];

export interface PmSocialLinkSetting {
  url: string;
  isPublic: boolean;
}

export type PmSocialLinks = Partial<Record<PmSocialPlatformKey, PmSocialLinkSetting>>;

export interface PoolManagerIdentityRow {
  username?: string | null;
  slug?: string | null;
  display_name: string;
  show_full_name?: boolean | null;
  social_links?: unknown;
}

export interface PoolManagerPublicIdentity {
  username: string;
  slug: string;
  publicDisplayName: string;
  fullName: string | null;
  showFullName: boolean;
  socialLinks: PmSocialLinks;
  publicSocialLinks: PmSocialLinks;
}

export function normalizePoolManagerUsername(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");
}

export function validatePoolManagerUsername(value: string): string | null {
  const normalized = normalizePoolManagerUsername(value);
  if (!normalized) return "Username is required.";
  if (normalized.length < 3) return "Username must be at least 3 characters.";
  if (normalized.length > 30) return "Username must be 30 characters or fewer.";
  if (!/^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/.test(normalized)) {
    return "Use letters, numbers, hyphens, or underscores only.";
  }
  return null;
}

export function formatPublicUsername(username: string): string {
  return `@${username}`;
}

export function parsePmSocialLinks(raw: unknown): PmSocialLinks {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};

  const result: PmSocialLinks = {};
  for (const platform of PM_SOCIAL_PLATFORMS) {
    const entry = (raw as Record<string, unknown>)[platform.key];
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const url = typeof (entry as { url?: unknown }).url === "string"
      ? (entry as { url: string }).url.trim()
      : "";
    if (!url) continue;
    result[platform.key] = {
      url,
      isPublic: Boolean((entry as { isPublic?: unknown }).isPublic),
    };
  }
  return result;
}

export function sanitizePmSocialLinks(input: PmSocialLinks): PmSocialLinks {
  const result: PmSocialLinks = {};
  for (const platform of PM_SOCIAL_PLATFORMS) {
    const entry = input[platform.key];
    const url = entry?.url?.trim() ?? "";
    if (!url) continue;
    result[platform.key] = {
      url,
      isPublic: Boolean(entry?.isPublic),
    };
  }
  return result;
}

export function buildPoolManagerPublicIdentity(
  row: PoolManagerIdentityRow
): PoolManagerPublicIdentity {
  const username = row.username ?? row.slug ?? normalizePoolManagerUsername(row.display_name);
  const slug = row.slug ?? username;
  const showFullName = Boolean(row.show_full_name);
  const socialLinks = parsePmSocialLinks(row.social_links);
  const publicSocialLinks = Object.fromEntries(
    Object.entries(socialLinks).filter(([, link]) => link.isPublic && link.url)
  ) as PmSocialLinks;

  return {
    username,
    slug,
    publicDisplayName: formatPublicUsername(username),
    fullName: showFullName ? row.display_name : null,
    showFullName,
    socialLinks,
    publicSocialLinks,
  };
}

export function resolvePoolManagerPublicLabel(row: PoolManagerIdentityRow): string {
  return buildPoolManagerPublicIdentity(row).publicDisplayName;
}

/** Public surfaces must never show legal names unless show_full_name is enabled (profile header only). */
export function resolvePublicManagerName(
  manager: PoolManagerIdentityRow | null | undefined,
  cachedName?: string | null
): string | null {
  if (manager) return resolvePoolManagerPublicLabel(manager);
  const trimmed = cachedName?.trim();
  if (trimmed?.startsWith("@")) return trimmed;
  return null;
}

export function managerRowToIdentity(row: {
  username?: string | null;
  slug?: string | null;
  display_name: string;
  show_full_name?: boolean | null;
}): PoolManagerIdentityRow {
  return {
    username: row.username,
    slug: row.slug,
    display_name: row.display_name,
    show_full_name: row.show_full_name,
  };
}
