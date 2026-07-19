"use client";



import Link from "next/link";

import { ChevronDown, LogOut, Settings } from "lucide-react";

import { ROUTES } from "@/constants/routes";

import { useAuthActions } from "@/hooks/use-auth";

import { UserAvatar } from "@/components/ui/user-avatar";

import { ClientOnly } from "@/components/ui/client-only";

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



function ProfileTrigger({

  displayName,

  avatarUrl,

}: {

  displayName: string;

  avatarUrl?: string | null;

}) {

  return (

    <button

      type="button"

      className="flex h-9 shrink-0 items-center gap-2 rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] py-1 pl-1 pr-2 outline-none transition-colors hover:bg-[var(--id-surface-hover)] focus-visible:ring-2 focus-visible:ring-[var(--pm-accent-ring)] lg:hidden"

      aria-label="Open profile menu"

    >

      <UserAvatar

        name={displayName}

        avatarUrl={avatarUrl}

        className="h-7 w-7 rounded-lg"

        fallbackClassName="text-[10px]"

      />

      <ChevronDown className="h-3.5 w-3.5 text-[var(--id-text-muted)]" />

    </button>

  );

}



export function PoolManagerMobileProfileMenu({

  displayName,

  avatarUrl,

  userEmail,

}: PoolManagerMobileProfileMenuProps) {

  const { signOut } = useAuthActions();



  return (

    <ClientOnly fallback={<ProfileTrigger displayName={displayName} avatarUrl={avatarUrl} />}>

      <DropdownMenu>

        <DropdownMenuTrigger asChild>

          <ProfileTrigger displayName={displayName} avatarUrl={avatarUrl} />

        </DropdownMenuTrigger>

        <DropdownMenuContent

          align="end"

          className="w-56 border-[var(--id-border)] bg-[var(--id-surface-elevated)] text-[var(--id-text)]"

        >

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

              Profile settings

            </Link>

          </DropdownMenuItem>

          <DropdownMenuItem asChild>

            <Link href={ROUTES.portfolio} className="cursor-pointer text-[var(--id-text-secondary)]">

              Investor Portfolio

            </Link>

          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-[var(--id-border)]" />

          <DropdownMenuItem

            className="text-[var(--id-danger)] focus:text-[var(--id-danger)]"

            onSelect={() => signOut()}

          >

            <LogOut className="h-4 w-4" strokeWidth={1.75} />

            Sign out

          </DropdownMenuItem>

        </DropdownMenuContent>

      </DropdownMenu>

    </ClientOnly>

  );

}

