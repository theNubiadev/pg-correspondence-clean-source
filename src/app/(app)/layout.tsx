import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth/guards";
import {
  canManageSystem,
  dashboardOfficeId,
  roleLabel,
} from "@/lib/auth/permissions";
import { visibleSections } from "@/lib/navigation";
import {
  getShellCounts,
  getShellNotifications,
} from "@/server/queries/shell";

/**
 * The authenticated boundary.
 *
 * The middleware has already turned away anyone without a valid token, but this
 * is where the session is confirmed against the database — so a revoked session
 * or a deactivated account is caught even though its JWT has not yet expired.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  // Department staff see counts for their own queue only — never Provost-wide.
  const [counts, notifications] = await Promise.all([
    getShellCounts(dashboardOfficeId(user), user.id),
    getShellNotifications(user.id),
  ]);

  return (
    <AppShell
      sections={visibleSections(user)}
      counts={counts}
      notifications={notifications}
      user={{
        fullName: user.fullName,
        email: user.email,
        initials: user.initials,
        avatarUrl: null,
        roleName: roleLabel(user.role),
        departmentName: user.destinationOfficeName ?? (canManageSystem(user) ? "College-wide" : null),
        canManageSettings: canManageSystem(user),
      }}
    >
      {children}
    </AppShell>
  );
}
