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

export async function getUnreadBadges(): Promise<UnreadBadges> {
  try {
    const member = await getActiveMembership();
    const supabase = await createClient();

    const { count: notificationsCount } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", member.profile_id)
      .eq("is_read", false);

    let announcements = 0;
    if (can(member.role, "view_announcements")) {
      const withReads = await supabase
        .from("announcements")
        .select("id, announcement_reads(profile_id)")
        .eq("academy_id", member.academy_id);

      if (!withReads.error) {
        announcements = (withReads.data ?? []).filter(
          (row) => !hasOwnRead(row.announcement_reads),
        ).length;
      }
    }

    const notifications = notificationsCount ?? 0;
    return {
      notifications,
      announcements,
      total: notifications + announcements,
    };
  } catch {
    return { notifications: 0, announcements: 0, total: 0 };
  }
}
