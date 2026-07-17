import { Suspense } from "react";
import { BottomNav } from "@/components/layout/bottom-nav";
import {
  APP_NAV_ITEMS,
  getAppNavItems,
  getVisibleMenuNavItems,
} from "@/components/layout/nav-items";
import { SideNav } from "@/components/layout/side-nav";
import { GraduationCelebrationHost } from "@/components/journey/graduation-celebration";
import { TrophyCelebrationHost } from "@/components/journey/trophy-celebration";
import {
  getPendingGraduationCelebrations,
  getPendingTrophyCelebrations,
} from "@/actions/journey";
import { getActiveMembership } from "@/lib/permissions/assert";
import { canAccessJourney } from "@/lib/journey/nav";
import { getUnreadBadges, type UnreadBadges } from "@/lib/inbox/unread";

const EMPTY_BADGES: UnreadBadges = {
  notifications: 0,
  announcements: 0,
  total: 0,
};

async function TrophyCelebrationSlot({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;
  const celebration = await getPendingTrophyCelebrations();
  if (!celebration) return null;
  return (
    <TrophyCelebrationHost
      memberId={celebration.memberId}
      initialItems={celebration.items}
    />
  );
}

async function GraduationCelebrationSlot({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;
  const celebration = await getPendingGraduationCelebrations();
  if (!celebration) return null;
  return (
    <GraduationCelebrationHost
      memberId={celebration.memberId}
      initialItems={celebration.items}
    />
  );
}

/**
 * Await nav chrome once so the dock does not flash the wrong role items.
 * Page data still benefits from React.cache + parallel fetches elsewhere.
 */
export async function AppShell({ children }: { children: React.ReactNode }) {
  let menuItems: ReturnType<typeof getVisibleMenuNavItems> = [];
  let navItems: ReturnType<typeof getAppNavItems> = APP_NAV_ITEMS;
  let badges = EMPTY_BADGES;
  let showCelebration = false;

  try {
    const membership = await getActiveMembership();
    menuItems = getVisibleMenuNavItems(membership.role);
    navItems = getAppNavItems(membership.role);
    showCelebration = canAccessJourney(membership.role);
    badges = await getUnreadBadges();
  } catch {
    menuItems = [];
    navItems = APP_NAV_ITEMS;
    badges = EMPTY_BADGES;
    showCelebration = false;
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col lg:mx-0 lg:max-w-none lg:flex-row">
      <SideNav
        primaryItems={navItems}
        menuItems={menuItems}
        badges={badges}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full flex-1 px-4 pb-40 pt-[max(1rem,calc(0.5rem+env(safe-area-inset-top)))] lg:max-w-5xl lg:px-8 lg:pb-10 lg:pt-8">
          {children}
        </main>
        <BottomNav items={navItems} menuHasUnread={badges.total > 0} />
      </div>
      <Suspense fallback={null}>
        <TrophyCelebrationSlot enabled={showCelebration} />
      </Suspense>
      <Suspense fallback={null}>
        <GraduationCelebrationSlot enabled={showCelebration} />
      </Suspense>
    </div>
  );
}
