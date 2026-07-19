export const PROFILE_ICON_BUCKET = "profile-icons";

/** 5 MB — matches Supabase bucket file_size_limit */
export const PROFILE_ICON_MAX_BYTES = 5 * 1024 * 1024;

export const PROFILE_ICON_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type ProfileIconMimeType = (typeof PROFILE_ICON_MIME_TYPES)[number];

export const POOL_IMAGE_BUCKET = "pool-images";

/** 5 MB — matches Supabase bucket file_size_limit */
export const POOL_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const POOL_IMAGE_MIME_TYPES = PROFILE_ICON_MIME_TYPES;

export type PoolImageMimeType = ProfileIconMimeType;
