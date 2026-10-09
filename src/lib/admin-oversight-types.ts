export type DashboardSummary = {
  total: number;
  incomingToday: number;
  awaitingAction: number;
  inProgress: number;
  kiv: number;
  overdue: number;
  completedToday: number;
  completed: number;
  closed: number;
  open: number;
  overdueAfterDays: number;
  physicalAwaiting: number;
  physicalNotReceived: number;
  orphanOpen: number;
};

export type AdminOfficePulse = {
  id: string;
  name: string;
  active: boolean;
  staff: number;
  open: number;
  overdue: number;
};

export type AdminOversight = {
  staff: {
    total: number;
    active: number;
    inactive: number;
    admins: number;
    provost: number;
    unitStaff: number;
    neverLoggedIn: number;
  };
  offices: AdminOfficePulse[];
  recentLogins: {
    id: string;
    fullName: string;
    username: string;
    lastLoginAt: Date | null;
    officeName: string | null;
  }[];
  recentAudit: {
    id: string;
    action: string;
    module: string;
    createdAt: Date;
    userName: string | null;
  }[];
};
