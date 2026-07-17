import { getUnreadBadges } from "@/lib/inbox/unread";
import { NotificationsGlassSheet } from "@/components/notifications/notifications-glass-sheet";

/** Header bell: only unread count on paint; list loads when the sheet opens. */
export async function HeaderNotificationsBell() {
  const badges = await getUnreadBadges();

  return (
    <NotificationsGlassSheet
      initialNotifications={[]}
      unreadCount={badges.notifications}
      loadOnOpen
    />
  );
}
