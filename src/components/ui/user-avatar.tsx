"use client";

import Image from "next/image";
import { cn, getInitials } from "@/lib/utils";

interface UserAvatarProps {
  name: string;
  avatarUrl?: string | null;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
}

export function UserAvatar({
  name,
  avatarUrl,
  className,
  imageClassName,
  fallbackClassName,
}: UserAvatarProps) {
  const initials = getInitials(name);

  if (avatarUrl) {
    return (
      <span
        className={cn(
          "relative inline-flex shrink-0 overflow-hidden rounded-lg bg-[var(--id-surface-muted)]",
          className
        )}
      >
        <Image
          src={avatarUrl}
          alt={`${name} profile photo`}
          fill
          sizes="64px"
          className={cn("object-cover", imageClassName)}
          unoptimized
        />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 font-semibold text-white",
        className
      )}
    >
      <span className={cn("leading-none", fallbackClassName)}>{initials}</span>
    </span>
  );
}
