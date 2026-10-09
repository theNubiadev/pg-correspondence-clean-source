"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatRelative } from "@/lib/format";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/server/actions/notifications";

export type ShellNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: Date | null;
  createdAt: Date;
  correspondenceId: string | null;
  correspondence: {
    id: string;
    referenceNumber: string;
  } | null;
};

export function NotificationBell({
  unreadCount,
  items,
}: {
  unreadCount: number;
  items: ShellNotification[];
}) {
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-9"
          aria-label={
            unreadCount > 0
              ? `${unreadCount} unread notifications`
              : "Notifications"
          }
        >
          <Bell className="size-4" aria-hidden="true" />
          {unreadCount > 0 ? (
            <span className="bg-destructive text-destructive-foreground absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.625rem] font-medium tabular-nums">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {unreadCount > 0 ? (
            <button
              type="button"
              disabled={pending}
              className="text-muted-foreground hover:text-foreground text-xs font-medium disabled:opacity-50"
              onClick={() =>
                startTransition(async () => {
                  await markAllNotificationsReadAction();
                })
              }
            >
              Mark all read
            </button>
          ) : null}
        </div>
        <DropdownMenuSeparator className="m-0" />
        {items.length === 0 ? (
          <p className="text-muted-foreground px-3 py-6 text-center text-sm">
            No notifications yet.
          </p>
        ) : (
          <div className="max-h-80 overflow-y-auto py-1">
            {items.map((item) => {
              const href = item.correspondenceId
                ? `/correspondence/${item.correspondenceId}`
                : "/dashboard";
              return (
                <DropdownMenuItem
                  key={item.id}
                  asChild
                  className="cursor-pointer rounded-none px-3 py-2.5 focus:bg-muted/60"
                >
                  <Link
                    href={href}
                    onClick={() => {
                      if (!item.readAt) {
                        startTransition(async () => {
                          await markNotificationReadAction(item.id);
                        });
                      }
                    }}
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-start gap-2">
                        {!item.readAt ? (
                          <span
                            className="bg-primary mt-1.5 size-1.5 shrink-0 rounded-full"
                            aria-hidden="true"
                          />
                        ) : (
                          <span className="mt-1.5 size-1.5 shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {item.title}
                          </p>
                          <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
                            {item.body}
                          </p>
                          <p className="text-muted-foreground mt-1 text-[0.6875rem]">
                            {formatRelative(item.createdAt)}
                            {item.correspondence
                              ? ` · ${item.correspondence.referenceNumber}`
                              : null}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
