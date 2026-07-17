import { listNotifications } from "@/actions/notifications";
import { NotificationsGlassSheet } from "@/components/notifications/notifications-glass-sheet";

export async function HeaderNotificationsBell() {
  let notifications: Awaited<ReturnType<typeof listNotifications>> = [];
  try {
    notifications = await listNotifications();
  } catch {
    notifications = [];
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <NotificationsGlassSheet
      initialNotifications={notifications}
      unreadCount={unreadCount}
    />
  );
}
