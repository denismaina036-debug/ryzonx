"use client";

import Link from "next/link";
import { Activity, ChevronDown, Layers, LogOut, Settings } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { useAuthActions } from "@/hooks/use-auth";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ClientOnly } from "@/components/ui/client-only";
import { WorkspaceSwitchLink } from "@/components/workspace/workspace-switch-link";
import { tapIconButton, tapProfileTrigger } from "@/lib/ui/interaction";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PoolManagerMobileProfileMenuProps {
  displayName: string;
  avatarUrl?: string | null;
  userEmail?: string;
}

function ProfileMenuContent({
  displayName,
  userEmail,
  onSignOut,
}: {
  displayName: string;
  userEmail?: string;
  onSignOut: () => void;
}) {
  return (
    <>
      <DropdownMenuLabel>
        <span className="block truncate font-medium text-[var(--id-text)]">{displayName}</span>
        {userEmail && (
          <span className="block truncate font-normal text-[var(--id-text-muted)]">{userEmail}</span>
        )}
      </DropdownMenuLabel>
      <DropdownMenuSeparator className="bg-[var(--id-border)]" />
      <DropdownMenuItem asChild>
        <Link href={ROUTES.poolManagerProfile} className="cursor-pointer text-[var(--id-text-secondary)]">
          <Settings className="h-4 w-4" strokeWidth={1.75} />
          Profile
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href={ROUTES.poolManagerStrategies} className="cursor-pointer text-[var(--id-text-secondary)]">
          <Layers className="h-4 w-4" strokeWidth={1.75} />
          Strategies
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href={ROUTES.poolManager} className="cursor-pointer text-[var(--id-text-secondary)]">
          <Activity className="h-4 w-4" strokeWidth={1.75} />
          Activity
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <WorkspaceSwitchLink
          target="investor"
          className="cursor-pointer text-[var(--id-text-secondary)]"
        />
      </DropdownMenuItem>
      <DropdownMenuSeparator className="bg-[var(--id-border)]" />
      <DropdownMenuItem
        className="text-[var(--id-danger)] focus:text-[var(--id-danger)]"
        onSelect={onSignOut}
      >
        <LogOut className="h-4 w-4" strokeWidth={1.75} />
        Sign out
      </DropdownMenuItem>
    </>
  );
}

function ProfileControls({
  displayName,
  avatarUrl,
  userEmail,
}: {
  displayName: string;
  avatarUrl?: string | null;
  userEmail?: string;
}) {
  const { signOut } = useAuthActions();

  return (
    <div
      className={cn(
        "flex h-9 shrink-0 items-center overflow-hidden rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] lg:hidden"
      )}
    >
      <Link
        href={ROUTES.poolManagerProfile}
        className={cn(
          tapProfileTrigger,
          "flex h-full items-center py-1 pl-1 pr-1.5 outline-none focus-visible:ring-2 focus-visible:ring-[var(--pm-accent-ring)]"
        )}
        aria-label="Open pool manager profile"
      >
        <UserAvatar
          name={displayName}
          avatarUrl={avatarUrl}
          className="h-7 w-7 rounded-lg"
          fallbackClassName="text-[10px]"
        />
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              tapIconButton,
              "flex h-full items-center justify-center px-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--pm-accent-ring)]"
            )}
            aria-label="Open profile menu"
          >
            <ChevronDown className="h-3.5 w-3.5 text-[var(--id-text-muted)]" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-56 border-[var(--id-border)] bg-[var(--id-surface-elevated)] text-[var(--id-text)]"
        >
          <ProfileMenuContent
            displayName={displayName}
            userEmail={userEmail}
            onSignOut={() => signOut()}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function PoolManagerMobileProfileMenu({
  displayName,
  avatarUrl,
  userEmail,
}: PoolManagerMobileProfileMenuProps) {
  return (
    <ClientOnly
      fallback={
        <Link
          href={ROUTES.poolManagerProfile}
          className={cn(tapProfileTrigger, "flex h-9 items-center rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] py-1 pl-1 pr-2 lg:hidden")}
          aria-label="Open pool manager profile"
        >
          <UserAvatar
            name={displayName}
            avatarUrl={avatarUrl}
            className="h-7 w-7 rounded-lg"
            fallbackClassName="text-[10px]"
          />
        </Link>
      }
    >
      <ProfileControls displayName={displayName} avatarUrl={avatarUrl} userEmail={userEmail} />
    </ClientOnly>
  );
}
