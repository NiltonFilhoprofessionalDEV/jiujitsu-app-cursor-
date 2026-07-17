import { cache } from "react";
import { getActiveMembership } from "@/lib/permissions/assert";
import { can } from "@/lib/permissions/capabilities";
import { createClient } from "@/lib/supabase/server";

export type UnreadBadges = {
  notifications: number;
  announcements: number;
  total: number;
};

function hasOwnRead(
  reads:
    | { profile_id: string }
    | { profile_id: string }[]
    | null
    | undefined,
): boolean {
  if (!reads) return false;
  if (Array.isArray(reads)) return reads.length > 0;
  return Boolean(reads.profile_id);
}

/** Dedupes badge queries within a single RSC request (shell + header). */
export const getUnreadBadges = cache(async (): Promise<UnreadBadges> => {
  try {
    const member = await getActiveMembership();
    const supabase = await createClient();

    const notificationsPromise = supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", member.profile_id)
      .eq("is_read", false);

    const announcementsPromise = can(member.role, "view_announcements")
      ? supabase
          .from("announcements")
          .select("id, class_id, announcement_reads(profile_id)")
          .eq("academy_id", member.academy_id)
      : Promise.resolve({ data: null, error: null });

    const enrolledPromise =
      member.role === "student" || member.role === "guardian"
        ? supabase
            .from("class_members")
            .select("class_id")
            .eq("member_id", member.id)
        : Promise.resolve({ data: null, error: null });

    const [notificationsResult, announcementsResult, enrolledResult] =
      await Promise.all([
        notificationsPromise,
        announcementsPromise,
        enrolledPromise,
      ]);

    const enrolledClassIds = new Set(
      (enrolledResult.data ?? []).map((row) => row.class_id as string),
    );

    let announcements = 0;
    if (!announcementsResult.error && announcementsResult.data) {
      announcements = announcementsResult.data.filter((row) => {
        const classId = (row as { class_id?: string | null }).class_id ?? null;
        if (
          (member.role === "student" || member.role === "guardian") &&
          classId &&
          !enrolledClassIds.has(classId)
        ) {
          return false;
        }
        return !hasOwnRead(row.announcement_reads);
      }).length;
    }

    const notifications = notificationsResult.count ?? 0;
    return {
      notifications,
      announcements,
      total: notifications + announcements,
    };
  } catch {
    return { notifications: 0, announcements: 0, total: 0 };
  }
});
