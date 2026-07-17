"use client";

import useSWR from "swr";
import type { StaffCheckinBoard } from "@/actions/attendance";
import { fetchStaffCheckin } from "@/actions/swr-data";
import { StaffCheckinCockpit } from "@/app/(app)/checkin/staff-checkin-cockpit";
import { swrKeys } from "@/lib/swr/keys";

export function StaffCheckinClient({
  initialBoard,
  canOpen,
  canApprove,
}: {
  initialBoard: StaffCheckinBoard;
  canOpen: boolean;
  canApprove: boolean;
}) {
  const { data: board = initialBoard } = useSWR(
    swrKeys.checkinStaff,
    fetchStaffCheckin,
    { fallbackData: initialBoard },
  );

  return (
    <StaffCheckinCockpit
      board={board}
      canOpen={canOpen}
      canApprove={canApprove}
    />
  );
}
