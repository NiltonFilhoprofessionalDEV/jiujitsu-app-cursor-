# Minha Jornada Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a aba **Minha Jornada** para alunos: resumo de aulas/faixa, troféus por marcos (5/10/25/50/100/200), timeline (entrada + graduações + conquistas), notificação + destaque ao desbloquear.

**Architecture:** Constantes e lógica pura em `lib/journey/*` (TDD); tabela `member_achievements` + RLS; Server Action carrega/sincroniza; unlock após `approveCheckin` e `manualAttendance`; nav role-aware (aluno → `/journey`, staff → `/stats`); UI layout A (resumo + grade + timeline).

**Tech Stack:** Next.js App Router, Server Actions, Supabase (Postgres + RLS), Vitest, Tailwind + componentes UI existentes, Lucide.

**Spec:** `docs/superpowers/specs/2026-07-17-minha-jornada-design.md`

**Pré-requisito do operador:** aplicar `supabase/migrations/0007_member_achievements.sql` no SQL Editor do Supabase antes de testar unlock/persistência autenticada.

---

## File structure (mapa)

```
lib/journey/milestones.ts              # thresholds + codes
lib/journey/achievements.ts            # quais codes desbloquear dado total de aulas
lib/journey/timeline.ts                # montar eventos ordenados
lib/journey/nav.ts                     # slot Stats vs Jornada por role
types/domain.ts                        # + view_own_journey
lib/permissions/capabilities.ts        # student: view_own_journey
supabase/migrations/0007_member_achievements.sql
actions/journey.ts                     # getJourneyData + unlockAchievementsIfNeeded
actions/attendance.ts                  # hook unlock após approve/manual
components/layout/nav-items.ts         # icon journey + getAppNavItems(role)
components/layout/bottom-nav.tsx       # recebe items
components/layout/side-nav.tsx         # recebe primary items
components/layout/app-shell.tsx        # passa nav por role
components/journey/journey-summary.tsx
components/journey/trophy-grid.tsx
components/journey/journey-timeline.tsx
app/(app)/journey/page.tsx
lib/supabase/middleware.ts             # + /journey
tests/journey-milestones.test.ts
tests/journey-achievements.test.ts
tests/journey-timeline.test.ts
tests/journey-nav.test.ts
tests/permissions.test.ts              # extend
```

---

### Task 1: Milestones constants (TDD)

**Files:**
- Create: `lib/journey/milestones.ts`
- Create: `tests/journey-milestones.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/journey-milestones.test.ts
import { describe, it, expect } from "vitest";
import {
  JOURNEY_MILESTONES,
  milestoneCode,
  nextMilestone,
} from "@/lib/journey/milestones";

describe("JOURNEY_MILESTONES", () => {
  it("has fixed v1 thresholds", () => {
    expect(JOURNEY_MILESTONES.map((m) => m.threshold)).toEqual([
      5, 10, 25, 50, 100, 200,
    ]);
  });

  it("uses classes_* codes", () => {
    expect(JOURNEY_MILESTONES.map((m) => m.code)).toEqual([
      "classes_5",
      "classes_10",
      "classes_25",
      "classes_50",
      "classes_100",
      "classes_200",
    ]);
  });
});

describe("milestoneCode", () => {
  it("builds code from threshold", () => {
    expect(milestoneCode(25)).toBe("classes_25");
  });
});

describe("nextMilestone", () => {
  it("returns next threshold above classCount", () => {
    expect(nextMilestone(8)?.threshold).toBe(10);
    expect(nextMilestone(25)?.threshold).toBe(50);
  });

  it("returns null when all unlocked", () => {
    expect(nextMilestone(200)).toBeNull();
    expect(nextMilestone(500)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/journey-milestones.test.ts`

Expected: FAIL — cannot find module `@/lib/journey/milestones`

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/journey/milestones.ts
export type JourneyMilestone = {
  code: string;
  threshold: number;
  label: string;
};

export const JOURNEY_MILESTONES: JourneyMilestone[] = [
  { code: "classes_5", threshold: 5, label: "5 aulas" },
  { code: "classes_10", threshold: 10, label: "10 aulas" },
  { code: "classes_25", threshold: 25, label: "25 aulas" },
  { code: "classes_50", threshold: 50, label: "50 aulas" },
  { code: "classes_100", threshold: 100, label: "100 aulas" },
  { code: "classes_200", threshold: 200, label: "200 aulas" },
];

export function milestoneCode(threshold: number): string {
  return `classes_${threshold}`;
}

export function nextMilestone(
  classCount: number,
): JourneyMilestone | null {
  return (
    JOURNEY_MILESTONES.find((m) => classCount < m.threshold) ?? null
  );
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `npx vitest run tests/journey-milestones.test.ts`

- [ ] **Step 5: Commit**

```bash
git add lib/journey/milestones.ts tests/journey-milestones.test.ts
git commit -m "feat(journey): add fixed class milestones"
```

---

### Task 2: Achievement unlock resolver (TDD)

**Files:**
- Create: `lib/journey/achievements.ts`
- Create: `tests/journey-achievements.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/journey-achievements.test.ts
import { describe, it, expect } from "vitest";
import { codesToUnlock } from "@/lib/journey/achievements";

describe("codesToUnlock", () => {
  it("returns all milestones reached that are not yet unlocked", () => {
    expect(codesToUnlock(25, [])).toEqual([
      "classes_5",
      "classes_10",
      "classes_25",
    ]);
  });

  it("skips already unlocked codes", () => {
    expect(codesToUnlock(25, ["classes_5", "classes_10"])).toEqual([
      "classes_25",
    ]);
  });

  it("returns empty when none reached", () => {
    expect(codesToUnlock(0, [])).toEqual([]);
    expect(codesToUnlock(4, [])).toEqual([]);
  });

  it("returns empty when all earned", () => {
    expect(
      codesToUnlock(200, [
        "classes_5",
        "classes_10",
        "classes_25",
        "classes_50",
        "classes_100",
        "classes_200",
      ]),
    ).toEqual([]);
  });
});
```

- [ ] **Step 2: Run — expect FAIL (module missing)**

Run: `npx vitest run tests/journey-achievements.test.ts`

- [ ] **Step 3: Implement**

```ts
// lib/journey/achievements.ts
import { JOURNEY_MILESTONES } from "@/lib/journey/milestones";

export function codesToUnlock(
  classCount: number,
  alreadyUnlocked: string[],
): string[] {
  const have = new Set(alreadyUnlocked);
  return JOURNEY_MILESTONES.filter(
    (m) => classCount >= m.threshold && !have.has(m.code),
  ).map((m) => m.code);
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npx vitest run tests/journey-achievements.test.ts`

- [ ] **Step 5: Commit**

```bash
git add lib/journey/achievements.ts tests/journey-achievements.test.ts
git commit -m "feat(journey): resolve milestone codes to unlock"
```

---

### Task 3: Timeline builder (TDD)

**Files:**
- Create: `lib/journey/timeline.ts`
- Create: `tests/journey-timeline.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/journey-timeline.test.ts
import { describe, it, expect } from "vitest";
import { buildJourneyTimeline } from "@/lib/journey/timeline";

describe("buildJourneyTimeline", () => {
  it("includes joined, graduations, and achievements newest first", () => {
    const events = buildJourneyTimeline({
      joinedAt: "2024-01-01T12:00:00.000Z",
      graduations: [
        {
          id: "g1",
          belt: "Azul",
          degree: 0,
          graduated_at: "2024-06-01T12:00:00.000Z",
        },
      ],
      achievements: [
        {
          id: "a1",
          code: "classes_10",
          unlocked_at: "2024-07-01T12:00:00.000Z",
        },
      ],
      milestoneLabels: { classes_10: "10 aulas" },
    });

    expect(events.map((e) => e.type)).toEqual([
      "achievement",
      "graduation",
      "joined",
    ]);
    expect(events[0].title).toContain("10 aulas");
    expect(events[1].title).toContain("Azul");
    expect(events[2].type).toBe("joined");
  });

  it("omits joined when joinedAt is null", () => {
    const events = buildJourneyTimeline({
      joinedAt: null,
      graduations: [],
      achievements: [],
      milestoneLabels: {},
    });
    expect(events).toEqual([]);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run tests/journey-timeline.test.ts`

- [ ] **Step 3: Implement**

```ts
// lib/journey/timeline.ts
export type TimelineEventType = "joined" | "graduation" | "achievement";

export type TimelineEvent = {
  id: string;
  type: TimelineEventType;
  title: string;
  at: string;
  meta?: string;
};

export function buildJourneyTimeline(input: {
  joinedAt: string | null;
  graduations: Array<{
    id: string;
    belt: string;
    degree: number;
    graduated_at: string;
  }>;
  achievements: Array<{
    id: string;
    code: string;
    unlocked_at: string;
  }>;
  milestoneLabels: Record<string, string>;
}): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  if (input.joinedAt) {
    events.push({
      id: `joined-${input.joinedAt}`,
      type: "joined",
      title: "Entrou na academia",
      at: input.joinedAt,
    });
  }

  for (const g of input.graduations) {
    events.push({
      id: g.id,
      type: "graduation",
      title: `Faixa ${g.belt} · grau ${g.degree}`,
      at: g.graduated_at,
    });
  }

  for (const a of input.achievements) {
    const label = input.milestoneLabels[a.code] ?? a.code;
    events.push({
      id: a.id,
      type: "achievement",
      title: `Troféu: ${label}`,
      at: a.unlocked_at,
      meta: a.code,
    });
  }

  return events.sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npx vitest run tests/journey-timeline.test.ts`

- [ ] **Step 5: Commit**

```bash
git add lib/journey/timeline.ts tests/journey-timeline.test.ts
git commit -m "feat(journey): build timeline events"
```

---

### Task 4: Role-aware primary nav slot (TDD)

**Files:**
- Create: `lib/journey/nav.ts`
- Create: `tests/journey-nav.test.ts`
- Modify: `types/domain.ts` (add capability)
- Modify: `lib/permissions/capabilities.ts`
- Modify: `tests/permissions.test.ts`

- [ ] **Step 1: Extend domain + capabilities + failing permission tests**

In `types/domain.ts`, add `"view_own_journey"` to `Capability`.

In `lib/permissions/capabilities.ts`, add `"view_own_journey"` only to `student` array.

Append to `tests/permissions.test.ts`:

```ts
  it("allows student view_own_journey", () => {
    expect(can("student", "view_own_journey")).toBe(true);
  });
  it("denies instructor view_own_journey", () => {
    expect(can("instructor", "view_own_journey")).toBe(false);
  });
  it("denies guardian view_own_journey in v1", () => {
    expect(can("guardian", "view_own_journey")).toBe(false);
  });
```

- [ ] **Step 2: Write nav tests**

```ts
// tests/journey-nav.test.ts
import { describe, it, expect } from "vitest";
import { primaryProgressNavItem } from "@/lib/journey/nav";

describe("primaryProgressNavItem", () => {
  it("returns stats for roles with view_dashboard", () => {
    expect(primaryProgressNavItem("instructor")).toEqual({
      href: "/stats",
      label: "Stats",
      icon: "stats",
    });
  });

  it("returns journey for student", () => {
    expect(primaryProgressNavItem("student")).toEqual({
      href: "/journey",
      label: "Jornada",
      icon: "journey",
    });
  });

  it("returns null for guardian (no stats, no journey v1)", () => {
    expect(primaryProgressNavItem("guardian")).toBeNull();
  });
});
```

- [ ] **Step 3: Run — expect FAIL on nav module**

Run: `npx vitest run tests/journey-nav.test.ts tests/permissions.test.ts`

- [ ] **Step 4: Implement nav helper**

```ts
// lib/journey/nav.ts
import { can } from "@/lib/permissions/capabilities";
import type { MemberRole } from "@/types/domain";

export type ProgressNavItem = {
  href: string;
  label: string;
  icon: "stats" | "journey";
};

export function primaryProgressNavItem(
  role: MemberRole,
): ProgressNavItem | null {
  if (can(role, "view_dashboard")) {
    return { href: "/stats", label: "Stats", icon: "stats" };
  }
  if (can(role, "view_own_journey")) {
    return { href: "/journey", label: "Jornada", icon: "journey" };
  }
  return null;
}
```

- [ ] **Step 5: Run — expect PASS**

Run: `npx vitest run tests/journey-nav.test.ts tests/permissions.test.ts`

- [ ] **Step 6: Commit**

```bash
git add types/domain.ts lib/permissions/capabilities.ts lib/journey/nav.ts tests/journey-nav.test.ts tests/permissions.test.ts
git commit -m "feat(journey): add view_own_journey and role nav slot"
```

---

### Task 5: Migration `member_achievements`

**Files:**
- Create: `supabase/migrations/0007_member_achievements.sql`

- [ ] **Step 1: Write migration**

```sql
-- Member achievements for Minha Jornada trophies

create table public.member_achievements (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  member_id uuid not null references public.academy_members(id) on delete cascade,
  code text not null,
  unlocked_at timestamptz not null default now(),
  unique (member_id, code)
);

create index member_achievements_member_id_idx
  on public.member_achievements (member_id);

create index member_achievements_academy_id_idx
  on public.member_achievements (academy_id);

alter table public.member_achievements enable row level security;

-- Student (or any profile) reads own achievements via membership
create policy member_achievements_select_own
  on public.member_achievements
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.academy_members am
      where am.id = member_id
        and am.profile_id = auth.uid()
    )
  );

-- Staff with dashboard can read academy achievements (optional analytics later)
create policy member_achievements_select_staff
  on public.member_achievements
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.academy_members am
      where am.academy_id = member_achievements.academy_id
        and am.profile_id = auth.uid()
        and am.status = 'active'
        and am.role in ('owner', 'administrator', 'instructor')
    )
  );

-- Inserts only for own member row OR staff of same academy
create policy member_achievements_insert_own_or_staff
  on public.member_achievements
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.academy_members am
      where am.id = member_id
        and am.academy_id = member_achievements.academy_id
        and am.status = 'active'
        and (
          am.profile_id = auth.uid()
          or exists (
            select 1
            from public.academy_members staff
            where staff.academy_id = am.academy_id
              and staff.profile_id = auth.uid()
              and staff.status = 'active'
              and staff.role in (
                'owner',
                'administrator',
                'instructor',
                'assistant_instructor'
              )
          )
        )
    )
  );
```

- [ ] **Step 2: Operator applies SQL in Supabase SQL Editor** (document in PR/notes)

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0007_member_achievements.sql
git commit -m "feat(journey): add member_achievements migration"
```

---

### Task 6: `actions/journey.ts` — unlock + load

**Files:**
- Create: `actions/journey.ts`

- [ ] **Step 1: Implement `unlockAchievementsIfNeeded`**

```ts
// actions/journey.ts (core unlock — full file in Step 2)
"use server";

import { createClient } from "@/lib/supabase/server";
import { codesToUnlock } from "@/lib/journey/achievements";
import { JOURNEY_MILESTONES } from "@/lib/journey/milestones";

export async function unlockAchievementsIfNeeded(input: {
  academyId: string;
  memberId: string;
  profileId: string;
}): Promise<string[]> {
  const supabase = await createClient();

  const { count, error: countError } = await supabase
    .from("attendance_records")
    .select("id", { count: "exact", head: true })
    .eq("student_id", input.memberId);

  if (countError) return [];

  const classCount = count ?? 0;

  const { data: existing, error: existingError } = await supabase
    .from("member_achievements")
    .select("code")
    .eq("member_id", input.memberId);

  if (existingError) return [];

  const already = (existing ?? []).map((r) => r.code as string);
  const toUnlock = codesToUnlock(classCount, already);
  if (toUnlock.length === 0) return [];

  const rows = toUnlock.map((code) => ({
    academy_id: input.academyId,
    member_id: input.memberId,
    code,
  }));

  const { error: insertError } = await supabase
    .from("member_achievements")
    .insert(rows);

  if (insertError) return [];

  const labelByCode = Object.fromEntries(
    JOURNEY_MILESTONES.map((m) => [m.code, m.label]),
  );

  for (const code of toUnlock) {
    await supabase.rpc("notify_profile", {
      p_profile_id: input.profileId,
      p_title: "Novo troféu!",
      p_description: `Você conquistou: ${labelByCode[code] ?? code}.`,
    });
  }

  return toUnlock;
}
```

- [ ] **Step 2: Implement `getJourneyData` for the page**

Export a typed payload:

```ts
export type JourneyData = {
  classCount: number;
  currentBelt: string | null;
  currentDegree: number | null;
  joinedAt: string | null;
  unlockedCodes: string[];
  recentUnlockedCodes: string[]; // unlocked_at within last 24h
  timeline: import("@/lib/journey/timeline").TimelineEvent[];
};

export async function getJourneyData(): Promise<JourneyData> {
  // 1. getActiveMembership + assert can view_own_journey (or throw PermissionError)
  // 2. count attendance_records where student_id = membership.id
  // 3. load academy_members belt/degree/joined_at
  // 4. call unlockAchievementsIfNeeded as fallback
  // 5. load member_achievements
  // 6. load graduation_history for member
  // 7. buildJourneyTimeline + return
}
```

Use `assertCapability("view_own_journey")` if available via assert helpers; otherwise `getActiveMembership` + `can` + `PermissionError`.

Also `revalidatePath("/journey")` and `revalidatePath("/notifications")` after unlock inside load is optional (prefer unlock callers to revalidate).

- [ ] **Step 3: Commit**

```bash
git add actions/journey.ts
git commit -m "feat(journey): add unlock and getJourneyData actions"
```

---

### Task 7: Hook unlock into attendance flows

**Files:**
- Modify: `actions/attendance.ts`

- [ ] **Step 1: After successful `approveCheckin` RPC**, before return success:

```ts
import { unlockAchievementsIfNeeded } from "@/actions/journey";

// after notify_profile for attendance…
if (am?.profile_id) {
  await unlockAchievementsIfNeeded({
    academyId: actor.academy_id,
    memberId: request.student_id as string,
    profileId: am.profile_id,
  });
}
revalidatePath("/journey");
revalidatePath("/notifications");
```

Ensure `request.student_id` is selected (already is).

- [ ] **Step 2: After successful `manualAttendance` insert**:

Load `profile_id` for `studentMemberId`, then:

```ts
const { data: studentFull } = await supabase
  .from("academy_members")
  .select("id, profile_id")
  .eq("id", studentMemberId)
  .maybeSingle();

if (studentFull?.profile_id) {
  await unlockAchievementsIfNeeded({
    academyId: actor.academy_id,
    memberId: studentFull.id,
    profileId: studentFull.profile_id,
  });
}
revalidatePath("/journey");
revalidatePath("/notifications");
```

(Prefer extending the earlier student select to include `profile_id` instead of a second query.)

- [ ] **Step 3: Commit**

```bash
git add actions/attendance.ts
git commit -m "feat(journey): unlock trophies on attendance confirm"
```

---

### Task 8: Wire role-aware bottom + side nav

**Files:**
- Modify: `components/layout/nav-items.ts`
- Modify: `components/layout/bottom-nav.tsx`
- Modify: `components/layout/side-nav.tsx`
- Modify: `components/layout/app-shell.tsx`
- Modify: `lib/supabase/middleware.ts`

- [ ] **Step 1: Add `journey` icon and `getAppNavItems(role)`**

```ts
// nav-items.ts additions
import { Route } from "lucide-react"; // or Trophy / Footprints
import { primaryProgressNavItem } from "@/lib/journey/nav";

// NavIconName += "journey"
// NAV_ICONS.journey = Route (or Trophy)

export function getAppNavItems(role: MemberRole): AppNavItem[] {
  const progress = primaryProgressNavItem(role);
  return APP_NAV_ITEMS.flatMap((item) => {
    if (item.href !== "/stats") return [item];
    if (!progress) return []; // drop stats slot for guardian
    return [
      {
        href: progress.href,
        label: progress.label,
        icon: progress.icon,
      },
    ];
  });
}
```

Note: dropping a slot makes a 4-item grid for guardian — acceptable v1; alternatively keep a disabled placeholder. Prefer drop + `grid-cols-5` still works with 4 items visually left-aligned, OR use dynamic `grid-cols-${n}`. Simpler: for `null`, keep Menu and leave Stats hidden by filtering — update BottomNav to `grid-cols-${items.length}` via style or class map (`grid-cols-4` | `grid-cols-5`).

- [ ] **Step 2: BottomNav / SideNav accept `items: AppNavItem[]`**

```tsx
// bottom-nav.tsx
export function BottomNav({ items }: { items: AppNavItem[] }) {
  // map over items instead of APP_NAV_ITEMS
  // className grid: items.length === 5 ? "grid-cols-5" : "grid-cols-4"
}
```

```tsx
// side-nav.tsx — replace DESKTOP_PRIMARY_NAV_ITEMS with prop primaryItems
// filter out /menu if present
```

- [ ] **Step 3: AppShell**

```tsx
const membership = await getActiveMembership();
const appNavItems = getAppNavItems(membership.role);
const menuItems = getVisibleMenuNavItems(membership.role);
// ...
<SideNav menuItems={menuItems} primaryItems={appNavItems.filter(i => i.href !== "/menu")} />
<BottomNav items={appNavItems} />
```

- [ ] **Step 4: Middleware** — add `"/journey"` to `PROTECTED_PREFIXES`.

- [ ] **Step 5: Commit**

```bash
git add components/layout/nav-items.ts components/layout/bottom-nav.tsx components/layout/side-nav.tsx components/layout/app-shell.tsx lib/supabase/middleware.ts
git commit -m "feat(journey): role-aware nav slot for Jornada"
```

---

### Task 9: UI components + page

**Files:**
- Create: `components/journey/journey-summary.tsx`
- Create: `components/journey/trophy-grid.tsx`
- Create: `components/journey/journey-timeline.tsx`
- Create: `app/(app)/journey/page.tsx`

- [ ] **Step 1: JourneySummary (server-friendly presentational)**

Props: `classCount`, `belt`, `degree`, `nextThreshold`, `remaining`.

Show total aulas, faixa, progress bar (`classCount / nextThreshold` or 100% if done).

- [ ] **Step 2: TrophyGrid (client for highlight animation)**

```tsx
"use client";
// props: unlockedCodes: string[]; recentUnlockedCodes: string[]
// map JOURNEY_MILESTONES
// recent → animate pulse / ring with --action-red
```

- [ ] **Step 3: JourneyTimeline**

Props: `events: TimelineEvent[]`. Vertical line + icons (Trophy / Award / UserPlus). Empty state: “Sua jornada começa no tatame.”

- [ ] **Step 4: Page**

```tsx
// app/(app)/journey/page.tsx
export default async function JourneyPage() {
  try {
    const data = await getJourneyData();
    // PageHeader title="Minha Jornada"
    // JourneySummary, TrophyGrid, JourneyTimeline
  } catch {
    redirect("/select-academy"); // or /home if PermissionError
  }
}
```

Match visual language of profile/home (rounded-2xl, border-border, action-red accents). No new purple/cream themes.

- [ ] **Step 5: Commit**

```bash
git add components/journey app/(app)/journey
git commit -m "feat(journey): add Minha Jornada page UI"
```

---

### Task 10: Verification

- [ ] **Step 1: Unit tests**

Run: `npx vitest run tests/journey-milestones.test.ts tests/journey-achievements.test.ts tests/journey-timeline.test.ts tests/journey-nav.test.ts tests/permissions.test.ts`

Expected: all PASS

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`

Expected: exit 0

- [ ] **Step 3: Manual checklist (after migration applied)**

1. Login como **student** → bottom nav mostra **Jornada** (não Stats)
2. Abrir `/journey` → resumo 0 aulas, troféus bloqueados, timeline com entrada
3. Staff aprova 5ª presença do aluno → notificação “Novo troféu!” + slot 5 desbloqueado
4. Login como **instructor** → nav ainda **Stats**
5. Guardian → sem Jornada/Stats no slot (4 itens) ou comportamento documentado

- [ ] **Step 4: Final commit if polish needed**

```bash
git add -A
git commit -m "feat(journey): polish Minha Jornada v1"
```

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| Bottom nav aluno = Jornada / staff = Stats | 4, 8 |
| Marcos 5/10/25/50/100/200 | 1 |
| Layout A resumo + troféus + timeline | 9 |
| Timeline entrada + faixas + troféus | 3, 6, 9 |
| Persist achievements | 5, 6 |
| Unlock on attendance + fallback on page | 6, 7 |
| Notification + highlight | 6, 9 |
| v2 academy config out of scope | constants only in Task 1 |
| Guardian out of scope | Task 4 denies capability |

No TBD placeholders remain in tasks above.
