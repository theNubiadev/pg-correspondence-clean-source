import type { CurrentUser } from "@/lib/auth/session";

export function testUser(
  overrides: Partial<CurrentUser> = {},
): CurrentUser {
  return {
    id: "user-1",
    email: "provost@pgcollege.ui.edu.ng",
    username: "provost",
    fullName: "Provost Staff",
    initials: "PS",
    role: "PROVOST_STAFF",
    status: "ACTIVE",
    mustChangePassword: false,
    destinationOfficeId: null,
    destinationOfficeName: null,
    sessionId: "session-1",
    ...overrides,
  };
}
