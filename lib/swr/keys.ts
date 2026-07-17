export const swrKeys = {
  homeDashboard: "home:dashboard",
  classesBoard: "classes:board",
  checkinStudent: "checkin:student",
  checkinStaff: "checkin:staff",
  members: (filters: {
    role?: string;
    status?: string;
    belt?: string;
    q?: string;
  }) =>
    [
      "members:list",
      filters.role ?? "",
      filters.status ?? "active",
      filters.belt ?? "",
      filters.q ?? "",
    ] as const,
} as const;
