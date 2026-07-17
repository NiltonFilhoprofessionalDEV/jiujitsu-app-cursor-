import { BottomNav } from "@/components/layout/bottom-nav";
import {
  APP_NAV_ITEMS,
  getAppNavItems,
  getVisibleMenuNavItems,
} from "@/components/layout/nav-items";
import { SideNav } from "@/components/layout/side-nav";
import { TrophyCelebrationHost } from "@/components/journey/trophy-celebration";
import { getPendingTrophyCelebrations } from "@/actions/journey";
import { getActiveMembership } from "@/lib/permissions/assert";
import { canAccessJourney } from "@/lib/journey/nav";
import { getUnreadBadges, type UnreadBadges } from "@/lib/inbox/unread";

const EMPTY_BADGES: UnreadBadges = {
  notifications: 0,
  announcements: 0,
  total: 0,
};

export async function AppShell({ children }: { children: React.ReactNode }) {
  let menuItems: ReturnType<typeof getVisibleMenuNavItems> = [];
  let navItems: ReturnType<typeof getAppNavItems> = APP_NAV_ITEMS;
  let celebration: Awaited<ReturnType<typeof getPendingTrophyCelebrations>> =
    null;
  let badges = EMPTY_BADGES;

  try {
    const membership = await getActiveMembership();
    menuItems = getVisibleMenuNavItems(membership.role);
    navItems = getAppNavItems(membership.role);
    badges = await getUnreadBadges();
    if (canAccessJourney(membership.role)) {
      celebration = await getPendingTrophyCelebrations();
    }
  } catch {
    menuItems = [];
    navItems = APP_NAV_ITEMS;
    celebration = null;
    badges = EMPTY_BADGES;
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col lg:mx-0 lg:max-w-none lg:flex-row">
      <SideNav
        primaryItems={navItems}
        menuItems={menuItems}
        badges={badges}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full flex-1 px-4 pb-40 pt-4 lg:max-w-5xl lg:px-8 lg:pb-10 lg:pt-8">
          {children}
        </main>
        <BottomNav items={navItems} menuHasUnread={badges.total > 0} />
      </div>
      {celebration ? (
        <TrophyCelebrationHost
          memberId={celebration.memberId}
          initialItems={celebration.items}
        />
      ) : null}
    </div>
  );
}
