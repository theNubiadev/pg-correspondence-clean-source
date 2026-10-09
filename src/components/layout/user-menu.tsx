"use client";

import Link from "next/link";
import {
  ChevronsUpDown,
  LogOut,
  Settings,
  UserRound,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { logoutAction } from "@/server/actions/auth";

export type UserMenuProps = {
  fullName: string;
  email: string;
  initials: string;
  avatarUrl: string | null;
  roleName: string;
  departmentName: string | null;
  canManageSettings?: boolean;
};

export function UserMenu({
  fullName,
  email,
  initials,
  avatarUrl,
  roleName,
  departmentName,
  canManageSettings = false,
}: UserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="hover:bg-sidebar-accent/70 focus-visible:ring-ring/45 flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors focus-visible:ring-[3px] focus-visible:outline-none">
        <Avatar className="size-8 rounded-lg">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
          <AvatarFallback className="bg-primary/10 text-primary rounded-lg text-xs font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{fullName}</p>
          <p className="text-muted-foreground truncate text-xs">{roleName}</p>
        </div>

        <ChevronsUpDown
          className="text-muted-foreground size-4 shrink-0"
          aria-hidden="true"
        />
        <span className="sr-only">Open account menu</span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" side="top" className="w-64 rounded-xl">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-semibold">{fullName}</p>
          <p className="text-muted-foreground truncate text-xs">{email}</p>
          <p className="text-muted-foreground mt-1.5 text-xs">
            {roleName}
            {departmentName ? ` · ${departmentName}` : ""}
          </p>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/settings/profile" className="cursor-pointer">
            <UserRound className="size-4" aria-hidden="true" />
            My details
          </Link>
        </DropdownMenuItem>

        {canManageSettings ? (
          <DropdownMenuItem asChild>
            <Link href="/settings" className="cursor-pointer">
              <Settings className="size-4" aria-hidden="true" />
              Settings
            </Link>
          </DropdownMenuItem>
        ) : null}

        <DropdownMenuSeparator />

        {/*
          A plain form post rather than a fetch: signing out must work even if
          client-side JavaScript has failed to load.
        */}
        <form action={logoutAction}>
          <button
            type="submit"
            className="hover:bg-destructive/8 text-destructive flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors"
          >
            <LogOut className="size-4" aria-hidden="true" />
            Sign out
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
