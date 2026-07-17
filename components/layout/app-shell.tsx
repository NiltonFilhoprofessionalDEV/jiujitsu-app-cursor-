import { Suspense } from "react";
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
import { getUnreadBadges, type UnreadBadges } from "@/lib/inbox/unread";

const EMPTY_BADGES: UnreadBadges = {
  notifications: 0,
  announcements: 0,
  total: 0,
};

async function SideNavSlot() {
  try {
    const membership = await getActiveMembership();
    const badges = await getUnreadBadges();
    return (
      <SideNav
        primaryItems={getAppNavItems(membership.role)}
        menuItems={getVisibleMenuNavItems(membership.role)}
        badges={badges}
      />
    );
  } catch {
    return (
      <SideNav
        primaryItems={APP_NAV_ITEMS}
        menuItems={[]}
        badges={EMPTY_BADGES}
      />
    );
  }
}

async function BottomNavSlot() {
  try {
    const membership = await getActiveMembership();
    const badges = await getUnreadBadges();
    return (
      <BottomNav
        items={getAppNavItems(membership.role)}
        menuHasUnread={badges.total > 0}
      />
    );
  } catch {
    return <BottomNav items={APP_NAV_ITEMS} menuHasUnread={false} />;
  }
}

async function TrophyCelebrationSlot() {
  const celebration = await getPendingTrophyCelebrations();
  if (!celebration) return null;
  return (
    <TrophyCelebrationHost
      memberId={celebration.memberId}
      initialItems={celebration.items}
    />
  );
}

/** Sync shell so page `{children}` can stream without waiting for nav data. */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col lg:mx-0 lg:max-w-none lg:flex-row">
      <Suspense
        fallback={
          <SideNav
            primaryItems={APP_NAV_ITEMS}
            menuItems={[]}
            badges={EMPTY_BADGES}
          />
        }
      >
        <SideNavSlot />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full flex-1 px-4 pb-40 pt-[max(1rem,calc(0.5rem+env(safe-area-inset-top)))] lg:max-w-5xl lg:px-8 lg:pb-10 lg:pt-8">
          {children}
        </main>
        <Suspense fallback={<BottomNav items={APP_NAV_ITEMS} menuHasUnread={false} />}>
          <BottomNavSlot />
        </Suspense>
      </div>
      <Suspense fallback={null}>
        <TrophyCelebrationSlot />
      </Suspense>
    </div>
  );
}
