import {
  canCreateCorrespondence,
  canManageSystem,
  isDepartmentStaff,
} from "@/lib/auth/permissions";
import type { CurrentUser } from "@/lib/auth/session";
import type { RegisterViewKey } from "@/lib/register-views";

/**
 * Live figures shown as badges beside the navigation.
 *
 * Declared here rather than next to the query that fills it, so that the client
 * components rendering the sidebar never reach into a `server-only` module.
 */
export type ShellCounts = {
  awaiting: number;
  overdue: number;
  unreadNotifications?: number;
};

export type NavItem = {
  label: string;
  href: string;
  icon: string;
  description: string;
  adminOnly?: boolean;
  createOnly?: boolean;
  provostOnly?: boolean;
  matchPrefix?: boolean;
  /** Marks the item as a saved view of the register rather than a page. */
  view?: RegisterViewKey;
  /** Which live figure to show as a badge. */
  badge?: keyof ShellCounts;
  /** Badges that mean "something is wrong" are drawn in the danger tone. */
  badgeTone?: "neutral" | "danger";
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

/**
 * Navigation is grouped by how often it is used, not by how the code is
 * organised: the three things done every hour sit at the top, the weekly return
 * sits under Management, and account administration is last because most users
 * never open it.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Daily work",
    items: [
      {
        label: "Overview",
        href: "/dashboard",
        icon: "LayoutDashboard",
        description: "What needs action now",
      },
      {
        label: "Awaiting action",
        href: "/correspondence?view=awaiting",
        icon: "Inbox",
        description: "Logged or directed, but not yet picked up",
        view: "awaiting",
        badge: "awaiting",
      },
      {
        label: "Keep in view",
        href: "/correspondence?view=kiv",
        icon: "Eye",
        description: "Parked for later review",
        view: "kiv",
      },
      {
        label: "Overdue",
        href: "/correspondence?view=overdue",
        icon: "TriangleAlert",
        description: "Still open well past the working turnaround",
        view: "overdue",
        badge: "overdue",
        badgeTone: "danger",
      },
      {
        label: "Full register",
        href: "/correspondence",
        icon: "Files",
        description: "Every letter received and its current status",
        matchPrefix: true,
      },
    ],
  },
  {
    title: "Management",
    items: [
      {
        label: "Reports",
        href: "/reports",
        icon: "FileText",
        description: "Daily, weekly and monthly returns",
        provostOnly: true,
      },
    ],
  },
  {
    title: "Administration",
    items: [
      {
        label: "Pre-launch",
        href: "/prelaunch",
        icon: "Calendar",
        description: "Record the briefing before the register goes live",
        adminOnly: true,
      },
      {
        label: "Users",
        href: "/staff",
        icon: "Users",
        description: "Create and manage staff accounts",
        adminOnly: true,
      },
      {
        label: "Settings",
        href: "/settings",
        icon: "Settings",
        description: "Destination departments, organisation details and imports",
        adminOnly: true,
        matchPrefix: true,
      },
      {
        label: "Audit logs",
        href: "/audit-trail",
        icon: "ShieldCheck",
        description: "A permanent record of every action taken",
        adminOnly: true,
      },
    ],
  },
];

export function visibleSections(user: CurrentUser): NavSection[] {
  const isAdmin = canManageSystem(user);
  const canCreate = canCreateCorrespondence(user);
  const isDept = isDepartmentStaff(user);
  const officeLabel = user.destinationOfficeName?.trim() || "your department";

  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    title:
      isAdmin && section.title === "Daily work" ? "Register" : section.title,
    items: section.items
      .filter((item) => {
        if (item.adminOnly && !isAdmin) return false;
        if (item.createOnly && !canCreate) return false;
        if (item.provostOnly && isDept) return false;
        return true;
      })
      .map((item) => {
        if (isAdmin && item.href === "/dashboard") {
          return {
            ...item,
            label: "Oversight",
            description: "Staff, units and college-wide register health",
          };
        }
        // Department staff get a department-framed nav, not Provost copy.
        if (!isDept) return item;
        if (item.href === "/dashboard") {
          return {
            ...item,
            description: `What is waiting in ${officeLabel}`,
          };
        }
        if (item.href === "/correspondence" && !item.view) {
          return {
            ...item,
            label: "Full register",
            description: "Every letter across the college",
          };
        }
        if (item.view === "awaiting") {
          const officeQuery = user.destinationOfficeId
            ? `&destinationOfficeId=${encodeURIComponent(user.destinationOfficeId)}`
            : "";
          return {
            ...item,
            label: "Waiting for physical copy",
            href: `/correspondence?view=physical-awaiting${officeQuery}`,
            view: "physical-awaiting" as RegisterViewKey,
            description: `Paper copies waiting in ${officeLabel}`,
          };
        }
        if (item.view === "overdue") {
          const officeQuery = user.destinationOfficeId
            ? `&destinationOfficeId=${encodeURIComponent(user.destinationOfficeId)}`
            : "";
          return {
            ...item,
            label: "Overdue",
            href: `/correspondence?view=overdue${officeQuery}`,
            description: `Past turnaround in ${officeLabel}`,
          };
        }
        return item;
      }),
  })).filter((section) => section.items.length > 0);

  return sections;
}

/**
 * Active-state matching.
 *
 * Saved views share the `/correspondence` pathname, so the view parameter has to
 * take part in the comparison — otherwise selecting "Overdue" would highlight
 * three items at once.
 */
export function isActivePath(
  pathname: string,
  item: Pick<NavItem, "href" | "matchPrefix" | "view">,
  currentView?: string | null,
): boolean {
  if (item.view) {
    return pathname === "/correspondence" && currentView === item.view;
  }
  if (item.href === "/dashboard") return pathname === "/dashboard";
  if (item.href === "/correspondence/new") {
    return pathname === "/correspondence/new";
  }
  if (item.href === "/correspondence") {
    // The full register is only "current" when no saved view is applied.
    return (
      (pathname === "/correspondence" && !currentView) ||
      (pathname.startsWith("/correspondence/") &&
        pathname !== "/correspondence/new")
    );
  }
  return item.matchPrefix
    ? pathname === item.href || pathname.startsWith(`${item.href}/`)
    : pathname === item.href;
}
