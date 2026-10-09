"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Wordmark } from "@/components/brand/crest";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import {
  NotificationBell,
  type ShellNotification,
} from "@/components/layout/notification-bell";
import { UserMenu, type UserMenuProps } from "@/components/layout/user-menu";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import {
  CommandPalette,
  SearchTrigger,
} from "@/components/layout/command-palette";
import type { NavSection, ShellCounts } from "@/lib/navigation";
import { IdleSessionGuard } from "@/components/auth/idle-session-guard";

/**
 * The application frame: fixed sidebar on desktop, slide-over on mobile, and a
 * sticky header carrying search and account controls.
 */
export function AppShell({
  sections,
  counts,
  notifications,
  user,
  children,
}: {
  sections: NavSection[];
  counts: ShellCounts;
  notifications: ShellNotification[];
  user: UserMenuProps;
  children: React.ReactNode;
}) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="bg-background min-h-svh lg:grid lg:grid-cols-[15.5rem_1fr] xl:grid-cols-[17rem_1fr]">
      <IdleSessionGuard />
      <a
        href="#main-content"
        className="bg-primary text-primary-foreground focus:ring-ring sr-only rounded-md px-4 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:ring-2"
      >
        Skip to main content
      </a>

      {/* --- Desktop sidebar --- */}
      <aside className="bg-sidebar border-sidebar-border sticky top-0 hidden h-svh flex-col border-r lg:flex">
        <div className="border-sidebar-border/70 flex h-16 items-center border-b px-4">
          <Link
            href="/dashboard"
            className="focus-visible:ring-ring/45 min-w-0 rounded-lg focus-visible:ring-[3px] focus-visible:outline-none"
          >
            <Wordmark />
          </Link>
        </div>

        <div className="scrollbar-thin flex-1 overflow-y-auto px-2.5 py-4">
          {/*
            SidebarNav reads `?view=` via useSearchParams, which Next requires
            behind a Suspense boundary so the shell can still stream.
          */}
          <Suspense fallback={null}>
            <SidebarNav sections={sections} counts={counts} />
          </Suspense>
        </div>

        <div className="border-sidebar-border/70 space-y-3 border-t p-3">
          <ThemeToggle className="w-full justify-center" />
          <UserMenu {...user} />
        </div>
      </aside>

      {/* --- Main column --- */}
      <div className="flex min-w-0 flex-col">
        <header className="bg-background/85 supports-[backdrop-filter]:bg-background/70 sticky top-0 z-30 border-b backdrop-blur-xl">
          <div className="flex h-16 items-center gap-2 px-4 sm:gap-3 sm:px-6">
            {/* --- Mobile nav --- */}
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-9 lg:hidden"
                  aria-label="Open menu"
                >
                  <Menu className="size-5" aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="bg-sidebar w-[18rem] p-0"
                aria-label="Main navigation"
              >
                <div className="flex h-16 items-center border-b px-4">
                  <Wordmark />
                </div>
                <div className="scrollbar-thin h-[calc(100svh-9rem)] overflow-y-auto px-2.5 py-4">
                  <Suspense fallback={null}>
                    <SidebarNav
                      sections={sections}
                      counts={counts}
                      onNavigate={() => setMobileNavOpen(false)}
                    />
                  </Suspense>
                </div>
                <div className="border-t p-3">
                  <ThemeToggle className="w-full justify-center" />
                </div>
              </SheetContent>
            </Sheet>

            <Link href="/dashboard" className="lg:hidden">
              <Wordmark className="sm:hidden" subtitle="Register" />
              <span className="sr-only">Go to overview</span>
            </Link>

            <SearchTrigger
              onClick={() => setPaletteOpen(true)}
              className="ml-auto w-auto lg:ml-0 lg:w-80"
            />

            <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
              <NotificationBell
                unreadCount={counts.unreadNotifications ?? 0}
                items={notifications}
              />

              <div className="lg:hidden">
                <UserMenuCompact user={user} />
              </div>
            </div>
          </div>
        </header>

        <main id="main-content" className="min-w-0 flex-1">
          {children}
        </main>
      </div>

      <CommandPalette
        sections={sections}
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
      />
    </div>
  );
}

/** On small screens the account menu sits in the header instead of the sidebar. */
function UserMenuCompact({ user }: { user: UserMenuProps }) {
  return (
    <div className="w-11">
      <UserMenu {...user} />
    </div>
  );
}
