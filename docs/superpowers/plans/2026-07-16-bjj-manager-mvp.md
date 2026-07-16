# BJJ Manager MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar o PWA multi-tenant BJJ Manager (auth, academia, membros, turmas, aulas, presença por toque, graduações, dashboard, avisos/notificações) com UI mobile-first premium dark.

**Architecture:** Next.js App Router + Server Actions falando com Supabase (Auth, Postgres+RLS, Realtime, Storage). Academia ativa em cookie. Sem QR no MVP; check-in por toque em sessão `open`.

**Tech Stack:** Next.js 15, TypeScript, TailwindCSS, shadcn/ui, React Hook Form, Zod, Recharts, Supabase, Vitest (lógica pura), PWA via `@ducanh2912/next-pwa` ou `serwist`.

**Spec:** `docs/superpowers/specs/2026-07-16-bjj-manager-design.md`  
**PRD:** `prd.md`  
**Remote:** `https://github.com/NiltonFilhoprofessionalDEV/jiujitsu-app-cursor-.git`

**Pré-requisito do operador:** criar `.env.local` com:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # só server, nunca expor no client
```
Aplicar migrations no projeto Supabase (SQL Editor ou CLI) antes de testar fluxos autenticados.

---

## File structure (mapa)

```
app/
  (auth)/login/page.tsx
  (auth)/signup/page.tsx
  (onboarding)/create-academy/page.tsx
  (onboarding)/select-academy/page.tsx
  (app)/layout.tsx                 # shell + bottom nav
  (app)/home/page.tsx
  (app)/classes/page.tsx
  (app)/classes/[id]/page.tsx
  (app)/checkin/page.tsx           # FAB target
  (app)/stats/page.tsx
  (app)/menu/page.tsx
  (app)/members/page.tsx
  (app)/members/new/page.tsx
  (app)/sessions/[id]/page.tsx     # aula aberta (approve)
  (app)/graduations/page.tsx
  (app)/announcements/page.tsx
  (app)/notifications/page.tsx
  (app)/academy/page.tsx
  (app)/profile/page.tsx
  api/ (somente se necessário)
components/
  layout/bottom-nav.tsx
  layout/app-shell.tsx
  ui/…                             # shadcn
  dashboard/…
  attendance/…
  members/…
lib/
  supabase/client.ts
  supabase/server.ts
  supabase/middleware.ts
  academy/context.ts               # get/set active academy
  auth/session.ts
  permissions/capabilities.ts
  permissions/assert.ts
  attendance/rules.ts
  validations/*.ts
actions/
  auth.ts
  academies.ts
  members.ts
  classes.ts
  sessions.ts
  attendance.ts
  graduations.ts
  announcements.ts
  notifications.ts
supabase/migrations/
  0001_init.sql
types/
  database.ts
  domain.ts
tests/
  permissions.test.ts
  attendance-rules.test.ts
  graduation.test.ts
```

---

### Task 1: Scaffold Next.js + tooling

**Files:**
- Create: project root via `create-next-app`
- Create: `.env.local.example`
- Modify: `.gitignore` (já existe — garantir entradas Next)

- [ ] **Step 1: Criar app Next.js no diretório do repo**

Run (PowerShell, na raiz do repo — arquivos `prd.md`/`docs/` devem permanecer):

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias "@/*" --turbopack --yes
```

Se o CLI reclamar de diretório não vazio, criar em subpasta `web/` e mover, **ou** inicializar manualmente `package.json` + configs. Preferência: app na raiz.

Expected: `package.json`, `app/`, `tailwind.config.ts` (ou v4), `tsconfig.json`.

- [ ] **Step 2: Instalar dependências do MVP**

```bash
npm install @supabase/supabase-js @supabase/ssr zod react-hook-form @hookform/resolvers recharts date-fns lucide-react clsx tailwind-merge class-variance-authority
npm install -D vitest @vitejs/plugin-react jsdom @types/node
```

- [ ] **Step 3: Configurar Vitest**

Create: `vitest.config.ts`

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});
```

Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 4: Criar `.env.local.example`**

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with Vitest and Supabase deps"
```

---

### Task 2: Design tokens + shadcn + app shell visual

**Files:**
- Create/Modify: `app/globals.css`
- Create: `lib/utils.ts`
- Create: `components/layout/app-shell.tsx`
- Create: `components/layout/bottom-nav.tsx`
- Create: `app/(app)/layout.tsx`
- Create: `app/(app)/home/page.tsx` (placeholder)

- [ ] **Step 1: Definir tokens CSS premium**

Em `app/globals.css` (além do Tailwind base):

```css
:root {
  --bg0: #070b16;
  --bg1: #121a2e;
  --card: rgba(255, 255, 255, 0.06);
  --card-border: rgba(255, 255, 255, 0.08);
  --text: #f8fafc;
  --muted: #94a3b8;
  --accent: #22c55e;
  --action-blue: #3b82f6;
  --action-purple: #8b5cf6;
  --action-pink: #ec4899;
  --danger: #f97316;
  --radius: 1.25rem;
}

body {
  min-height: 100dvh;
  color: var(--text);
  background: linear-gradient(165deg, var(--bg0) 0%, var(--bg1) 55%, #0d1526 100%);
  font-family: var(--font-sans), system-ui, sans-serif;
}
```

Usar `next/font` com **Plus_Jakarta_Sans** (ou Geist) em `app/layout.tsx` — não Inter.

- [ ] **Step 2: `lib/utils.ts`**

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 3: Inicializar shadcn e componentes base**

```bash
npx shadcn@latest init -y
npx shadcn@latest add button input label card dialog sheet toast form avatar badge separator tabs
```

Ajustar tema shadcn para dark + accent green se o init gerar CSS vars conflitantes.

- [ ] **Step 4: Bottom nav + shell**

Create `components/layout/bottom-nav.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, BarChart3, Menu, CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/classes", label: "Turmas", icon: CalendarDays },
  { href: "/checkin", label: "Check-in", icon: CircleDot, fab: true },
  { href: "/stats", label: "Stats", icon: BarChart3 },
  { href: "/menu", label: "Menu", icon: Menu },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 mx-auto max-w-lg border-t border-white/10 bg-[#0b1220]/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-5 items-end px-2 pt-2 pb-3">
        {items.map(({ href, label, icon: Icon, fab }) => {
          const active = pathname.startsWith(href);
          if (fab) {
            return (
              <li key={href} className="flex justify-center">
                <Link
                  href={href}
                  className="-mt-7 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent)] text-black shadow-[0_0_24px_rgba(34,197,94,0.55)]"
                  aria-label={label}
                >
                  <Icon className="h-6 w-6" />
                </Link>
              </li>
            );
          }
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-1 text-[10px]",
                  active ? "text-[var(--accent)]" : "text-white/50"
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
```

`app/(app)/layout.tsx` envolve children com max-width mobile + `BottomNav` + padding-bottom.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(ui): premium dark tokens, shadcn, bottom nav shell"
```

---

### Task 3: Schema SQL + RLS + seeds

**Files:**
- Create: `supabase/migrations/0001_init.sql`
- Create: `types/domain.ts`

- [ ] **Step 1: Escrever migration completa**

Create `supabase/migrations/0001_init.sql` com enums, tabelas do spec, trigger de profile, RLS, seed de `belt_levels`.

Conteúdo obrigatório (aplicar no Supabase):

```sql
-- enums
create type public.member_role as enum (
  'owner', 'administrator', 'instructor',
  'assistant_instructor', 'student', 'guardian'
);
create type public.member_status as enum ('active', 'inactive', 'suspended');
create type public.session_status as enum ('scheduled', 'open', 'finished', 'cancelled');
create type public.attendance_request_status as enum ('pending', 'approved', 'rejected');
create type public.attendance_type as enum ('self_checkin', 'manual');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  avatar_url text,
  phone text,
  birth_date date,
  gender text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.academies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  phone text,
  email text,
  instagram text,
  city text,
  state text,
  address text,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.academy_units (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  name text not null,
  address text,
  city text,
  state text,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.academy_members (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.member_role not null,
  status public.member_status not null default 'active',
  current_belt text,
  current_degree int not null default 0,
  joined_at date not null default current_date,
  emergency_contact_name text,
  emergency_contact_phone text,
  medical_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (academy_id, profile_id)
);

create table public.belt_levels (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  "order" int not null unique
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  unit_id uuid references public.academy_units(id) on delete set null,
  name text not null,
  description text,
  minimum_age int,
  maximum_age int,
  minimum_belt text,
  maximum_belt text,
  is_active boolean not null default true
);

create table public.class_schedules (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null
);

create table public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  instructor_id uuid not null references public.academy_members(id),
  date date not null,
  started_at timestamptz,
  finished_at timestamptz,
  status public.session_status not null default 'scheduled'
);

create table public.attendance_requests (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.class_sessions(id) on delete cascade,
  student_id uuid not null references public.academy_members(id),
  requested_at timestamptz not null default now(),
  status public.attendance_request_status not null default 'pending'
);

create unique index attendance_requests_one_pending
  on public.attendance_requests (session_id, student_id)
  where status = 'pending';

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.class_sessions(id) on delete cascade,
  student_id uuid not null references public.academy_members(id),
  checked_at timestamptz not null default now(),
  attendance_type public.attendance_type not null,
  unique (session_id, student_id)
);

create table public.graduation_history (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.academy_members(id) on delete cascade,
  belt text not null,
  degree int not null default 0,
  graduated_at date not null default current_date,
  awarded_by uuid references public.academy_members(id),
  notes text,
  certificate_url text
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  title text not null,
  description text not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- profile trigger
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- helper: membership
create or replace function public.is_academy_member(aid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.academy_members m
    where m.academy_id = aid
      and m.profile_id = auth.uid()
      and m.status = 'active'
  );
$$;

create or replace function public.has_academy_role(aid uuid, roles public.member_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.academy_members m
    where m.academy_id = aid
      and m.profile_id = auth.uid()
      and m.status = 'active'
      and m.role = any(roles)
  );
$$;

alter table public.profiles enable row level security;
alter table public.academies enable row level security;
alter table public.academy_units enable row level security;
alter table public.academy_members enable row level security;
alter table public.classes enable row level security;
alter table public.class_schedules enable row level security;
alter table public.class_sessions enable row level security;
alter table public.attendance_requests enable row level security;
alter table public.attendance_records enable row level security;
alter table public.graduation_history enable row level security;
alter table public.announcements enable row level security;
alter table public.notifications enable row level security;
alter table public.belt_levels enable row level security;

create policy profiles_select_self on public.profiles for select using (id = auth.uid());
create policy profiles_update_self on public.profiles for update using (id = auth.uid());
create policy profiles_select_same_academy on public.profiles for select using (
  exists (
    select 1 from public.academy_members me
    join public.academy_members other on other.academy_id = me.academy_id
    where me.profile_id = auth.uid() and other.profile_id = profiles.id and me.status = 'active'
  )
);

create policy academies_select_member on public.academies for select using (public.is_academy_member(id));
create policy academies_insert_authenticated on public.academies for insert with check (auth.uid() is not null);
create policy academies_update_owner on public.academies for update using (
  public.has_academy_role(id, array['owner']::public.member_role[])
);

create policy units_all_member on public.academy_units for all using (public.is_academy_member(academy_id))
  with check (
    public.has_academy_role(academy_id, array['owner','administrator']::public.member_role[])
  );

create policy members_select on public.academy_members for select using (public.is_academy_member(academy_id));
create policy members_insert_staff on public.academy_members for insert with check (
  public.has_academy_role(academy_id, array['owner','administrator','instructor']::public.member_role[])
);
create policy members_update_staff on public.academy_members for update using (
  public.has_academy_role(academy_id, array['owner','administrator','instructor']::public.member_role[])
);

create policy classes_select on public.classes for select using (public.is_academy_member(academy_id));
create policy classes_write on public.classes for all using (
  public.has_academy_role(academy_id, array['owner','administrator','instructor']::public.member_role[])
) with check (
  public.has_academy_role(academy_id, array['owner','administrator','instructor']::public.member_role[])
);

create policy schedules_select on public.class_schedules for select using (
  exists (select 1 from public.classes c where c.id = class_id and public.is_academy_member(c.academy_id))
);
create policy schedules_write on public.class_schedules for all using (
  exists (
    select 1 from public.classes c
    where c.id = class_id
      and public.has_academy_role(c.academy_id, array['owner','administrator','instructor']::public.member_role[])
  )
) with check (
  exists (
    select 1 from public.classes c
    where c.id = class_id
      and public.has_academy_role(c.academy_id, array['owner','administrator','instructor']::public.member_role[])
  )
);

create policy sessions_select on public.class_sessions for select using (
  exists (select 1 from public.classes c where c.id = class_id and public.is_academy_member(c.academy_id))
);
create policy sessions_write on public.class_sessions for all using (
  exists (
    select 1 from public.classes c
    where c.id = class_id
      and public.has_academy_role(
        c.academy_id,
        array['owner','administrator','instructor','assistant_instructor']::public.member_role[]
      )
  )
) with check (
  exists (
    select 1 from public.classes c
    where c.id = class_id
      and public.has_academy_role(
        c.academy_id,
        array['owner','administrator','instructor','assistant_instructor']::public.member_role[]
      )
  )
);

create policy att_req_select on public.attendance_requests for select using (
  exists (
    select 1 from public.class_sessions s
    join public.classes c on c.id = s.class_id
    where s.id = session_id and public.is_academy_member(c.academy_id)
  )
);
create policy att_req_insert on public.attendance_requests for insert with check (
  exists (
    select 1 from public.class_sessions s
    join public.classes c on c.id = s.class_id
    join public.academy_members m on m.id = student_id
    where s.id = session_id and m.profile_id = auth.uid() and public.is_academy_member(c.academy_id)
  )
);
create policy att_req_update on public.attendance_requests for update using (
  exists (
    select 1 from public.class_sessions s
    join public.classes c on c.id = s.class_id
    where s.id = session_id
      and public.has_academy_role(c.academy_id, array['owner','administrator','instructor']::public.member_role[])
  )
);

create policy att_rec_select on public.attendance_records for select using (
  exists (
    select 1 from public.class_sessions s
    join public.classes c on c.id = s.class_id
    where s.id = session_id and public.is_academy_member(c.academy_id)
  )
);
create policy att_rec_insert on public.attendance_records for insert with check (
  exists (
    select 1 from public.class_sessions s
    join public.classes c on c.id = s.class_id
    where s.id = session_id
      and public.has_academy_role(
        c.academy_id,
        array['owner','administrator','instructor','assistant_instructor']::public.member_role[]
      )
  )
);

create policy grad_select on public.graduation_history for select using (
  exists (
    select 1 from public.academy_members m
    where m.id = member_id and public.is_academy_member(m.academy_id)
  )
);
create policy grad_insert on public.graduation_history for insert with check (
  exists (
    select 1 from public.academy_members m
    where m.id = member_id
      and public.has_academy_role(m.academy_id, array['owner','administrator','instructor']::public.member_role[])
  )
);

create policy ann_select on public.announcements for select using (public.is_academy_member(academy_id));
create policy ann_write on public.announcements for all using (
  public.has_academy_role(academy_id, array['owner','administrator','instructor']::public.member_role[])
) with check (
  public.has_academy_role(academy_id, array['owner','administrator','instructor']::public.member_role[])
);

create policy notif_own on public.notifications for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy belt_levels_read on public.belt_levels for select using (auth.uid() is not null);

insert into public.belt_levels (name, "order") values
  ('Branca',1),('Cinza',2),('Amarela',3),('Laranja',4),('Verde',5),
  ('Azul',6),('Roxa',7),('Marrom',8),('Preta',9),('Coral',10),('Vermelha',11);
```

No Dashboard Supabase: habilitar Realtime para `attendance_requests`.

- [ ] **Step 2: Tipos de domínio**

Create `types/domain.ts`:

```ts
export type MemberRole =
  | "owner"
  | "administrator"
  | "instructor"
  | "assistant_instructor"
  | "student"
  | "guardian";

export type MemberStatus = "active" | "inactive" | "suspended";
export type SessionStatus = "scheduled" | "open" | "finished" | "cancelled";
export type AttendanceRequestStatus = "pending" | "approved" | "rejected";
export type AttendanceType = "self_checkin" | "manual";

export type Capability =
  | "manage_academy"
  | "view_dashboard"
  | "manage_members"
  | "view_members"
  | "manage_classes"
  | "open_session"
  | "close_session"
  | "approve_attendance"
  | "manual_attendance"
  | "self_checkin"
  | "graduate"
  | "manage_announcements"
  | "view_announcements";
```

- [ ] **Step 3: Aplicar migration no Supabase do cliente**

Operador cola SQL no SQL Editor (ou `supabase db push`). Verificar seed de faixas.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0001_init.sql types/domain.ts
git commit -m "feat(db): initial schema, RLS helpers, belt seed"
```

---

### Task 4: Supabase clients + middleware + academy cookie

**Files:**
- Create: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/middleware.ts`
- Create: `middleware.ts`
- Create: `lib/academy/context.ts`

- [ ] **Step 1: Clients SSR (padrão oficial `@supabase/ssr`)**

`lib/supabase/server.ts` — `createServerClient` com cookies do `next/headers`.  
`lib/supabase/client.ts` — `createBrowserClient`.  
`middleware.ts` — refresh session + proteger rotas `(app)/*` redirecionando para `/login`.

- [ ] **Step 2: Academia ativa**

```ts
// lib/academy/context.ts
import { cookies } from "next/headers";

export const ACADEMY_COOKIE = "bjj_active_academy";

export async function getActiveAcademyId(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACADEMY_COOKIE)?.value ?? null;
}

export async function setActiveAcademyId(academyId: string) {
  const store = await cookies();
  store.set(ACADEMY_COOKIE, academyId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/supabase middleware.ts lib/academy
git commit -m "feat(auth): Supabase SSR clients, middleware, academy cookie"
```

---

### Task 5: Permissions module (TDD)

**Files:**
- Create: `lib/permissions/capabilities.ts`
- Create: `lib/permissions/assert.ts`
- Test: `tests/permissions.test.ts`

- [ ] **Step 1: Teste falhando**

```ts
import { describe, it, expect } from "vitest";
import { can } from "@/lib/permissions/capabilities";

describe("can", () => {
  it("allows instructor to manage members", () => {
    expect(can("instructor", "manage_members")).toBe(true);
  });
  it("denies student manage_members", () => {
    expect(can("student", "manage_members")).toBe(false);
  });
  it("allows student self_checkin", () => {
    expect(can("student", "self_checkin")).toBe(true);
  });
  it("denies assistant_instructor approve_attendance", () => {
    expect(can("assistant_instructor", "approve_attendance")).toBe(false);
  });
  it("allows owner manage_academy", () => {
    expect(can("owner", "manage_academy")).toBe(true);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm test -- tests/permissions.test.ts
```

- [ ] **Step 3: Implementar matriz**

```ts
import type { Capability, MemberRole } from "@/types/domain";

const matrix: Record<MemberRole, Capability[]> = {
  owner: [
    "manage_academy", "view_dashboard", "manage_members", "view_members",
    "manage_classes", "open_session", "close_session", "approve_attendance",
    "manual_attendance", "graduate", "manage_announcements", "view_announcements",
  ],
  administrator: [
    "view_dashboard", "manage_members", "view_members", "manage_classes",
    "open_session", "close_session", "approve_attendance", "manual_attendance",
    "graduate", "manage_announcements", "view_announcements",
  ],
  instructor: [
    "view_dashboard", "manage_members", "view_members", "manage_classes",
    "open_session", "close_session", "approve_attendance", "manual_attendance",
    "graduate", "manage_announcements", "view_announcements",
  ],
  assistant_instructor: [
    "view_members", "open_session", "manual_attendance", "view_announcements",
  ],
  student: ["self_checkin", "view_announcements"],
  guardian: ["view_announcements", "view_members"],
};

export function can(role: MemberRole, capability: Capability): boolean {
  return matrix[role]?.includes(capability) ?? false;
}
```

`assert.ts`: helper async que carrega membership da academia ativa e lança erro tipado se `!can(...)`.

- [ ] **Step 4: Run — expect PASS**

```bash
npm test -- tests/permissions.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add lib/permissions tests/permissions.test.ts
git commit -m "feat: role capability matrix with tests"
```

---

### Task 6: Auth UI + actions

**Files:**
- Create: `actions/auth.ts`
- Create: `app/(auth)/login/page.tsx`, `app/(auth)/signup/page.tsx`
- Create: `lib/validations/auth.ts`

- [ ] **Step 1: Schemas Zod**

```ts
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const signupSchema = loginSchema.extend({
  name: z.string().min(2),
});
```

- [ ] **Step 2: Server actions signup/login/logout** usando `createClient` server; signup passa `options.data: { name }`.

- [ ] **Step 3: Páginas mobile premium** (glass card, CTA verde, pt-BR).

- [ ] **Step 4: Após login** — se sem membership → `/create-academy`; se várias → `/select-academy`; se uma → set cookie + `/home`.

- [ ] **Step 5: Commit**

```bash
git add actions/auth.ts app/(auth) lib/validations/auth.ts
git commit -m "feat(auth): login/signup flows and redirects"
```

---

### Task 7: Onboarding academia + units

**Files:**
- Create: `actions/academies.ts`
- Create: `app/(onboarding)/create-academy/page.tsx`
- Create: `app/(onboarding)/select-academy/page.tsx`
- Create: `app/(app)/academy/page.tsx`

- [ ] **Step 1: `createAcademy` action** — insert `academies`, insert `academy_members` role `owner`, set cookie, redirect `/home`. Campos do PRD (nome, telefone, email, instagram, cidade, estado, endereço, descrição; logo via Storage opcional na mesma task ou follow-up imediato).

- [ ] **Step 2: `selectAcademy` / `listMyAcademies`**

- [ ] **Step 3: Página academia (Owner)** — editar dados + CRUD units + toggle `is_active`.

- [ ] **Step 4: Commit**

```bash
git add actions/academies.ts app/(onboarding) app/(app)/academy
git commit -m "feat: academy onboarding, selector, and units"
```

---

### Task 8: Members CRUD

**Files:**
- Create: `actions/members.ts`
- Create: `app/(app)/members/page.tsx`, `app/(app)/members/new/page.tsx`
- Create: `lib/validations/members.ts`

- [ ] **Step 1: Validação + action `createMember`** — para MVP: cadastrar member vinculado a `profile_id` existente **ou** fluxo “convidar por email” simplificado: se email não existe, criar só registro local não é possível sem auth user — **estratégia MVP:** Owner/Admin/Instructor cadastra dados e o aluno faz signup com o mesmo email depois; **ou** usar invite Supabase. Escolher: **criar member apenas para profiles já existentes** + tela “vincular por email” (busca profile por email). Documentar no UI.

- [ ] **Step 2: List/filter** por role/status/faixa; assert `manage_members` / `view_members`.

- [ ] **Step 3: Edit status/role/emergency/medical** (Owner pode role; Instructor não promove a Owner).

- [ ] **Step 4: Commit**

```bash
git add actions/members.ts app/(app)/members lib/validations/members.ts
git commit -m "feat: academy members list and registration"
```

---

### Task 9: Classes + schedules

**Files:**
- Create: `actions/classes.ts`
- Create: `app/(app)/classes/page.tsx`, `app/(app)/classes/[id]/page.tsx`
- Create: `lib/validations/classes.ts`

- [ ] **Step 1: CRUD classes** com assert `manage_classes`.

- [ ] **Step 2: Schedules** weekday 0–6 + start/end time.

- [ ] **Step 3: UI lista + detalhe** com botão “Abrir aula” (se `open_session`).

- [ ] **Step 4: Commit**

```bash
git add actions/classes.ts app/(app)/classes lib/validations/classes.ts
git commit -m "feat: classes and weekly schedules"
```

---

### Task 10: Attendance rules (TDD) + sessions/check-in

**Files:**
- Create: `lib/attendance/rules.ts`
- Test: `tests/attendance-rules.test.ts`
- Create: `actions/sessions.ts`, `actions/attendance.ts`
- Create: `app/(app)/sessions/[id]/page.tsx`, `app/(app)/checkin/page.tsx`

- [ ] **Step 1: Testes das regras**

```ts
import { describe, it, expect } from "vitest";
import {
  canRequestCheckin,
  canApproveRequest,
} from "@/lib/attendance/rules";

describe("attendance rules", () => {
  it("blocks checkin when session not open", () => {
    expect(
      canRequestCheckin({ sessionStatus: "finished", hasPending: false, hasRecord: false })
    ).toEqual({ ok: false, reason: "session_not_open" });
  });
  it("blocks duplicate pending", () => {
    expect(
      canRequestCheckin({ sessionStatus: "open", hasPending: true, hasRecord: false })
    ).toEqual({ ok: false, reason: "already_pending" });
  });
  it("allows checkin when open and clean", () => {
    expect(
      canRequestCheckin({ sessionStatus: "open", hasPending: false, hasRecord: false })
    ).toEqual({ ok: true });
  });
  it("approve only from pending", () => {
    expect(canApproveRequest("pending")).toBe(true);
    expect(canApproveRequest("approved")).toBe(false);
  });
});
```

- [ ] **Step 2: Implementar `lib/attendance/rules.ts` até PASS**

- [ ] **Step 3: `openSession` / `closeSession` actions**

- [ ] **Step 4: `requestCheckin` (student)** → insert request; `approveCheckin` → update request + insert record `self_checkin` + notification; `rejectCheckin`; `manualAttendance`.

- [ ] **Step 5: UI sessão aberta** com lista pending (subscribe Realtime) + botões aprovar/rejeitar/encerrar.

- [ ] **Step 6: UI `/checkin`** lista sessões `open` da academia ativa → “Registrar presença”.

- [ ] **Step 7: Commit**

```bash
git add lib/attendance actions/sessions.ts actions/attendance.ts app/(app)/sessions app/(app)/checkin tests/attendance-rules.test.ts
git commit -m "feat: open sessions and tap check-in attendance flow"
```

---

### Task 11: Graduations (append-only)

**Files:**
- Create: `lib/graduations/apply.ts`
- Test: `tests/graduation.test.ts`
- Create: `actions/graduations.ts`
- Create: `app/(app)/graduations/page.tsx`

- [ ] **Step 1: Teste** — `applyGraduation` retorna `{ historyInsert, memberPatch }` sem mutar histórico antigo.

```ts
import { describe, it, expect } from "vitest";
import { buildGraduationUpdate } from "@/lib/graduations/apply";

describe("buildGraduationUpdate", () => {
  it("builds append-only payload", () => {
    const result = buildGraduationUpdate({
      memberId: "m1",
      belt: "Azul",
      degree: 2,
      awardedBy: "i1",
      notes: "Promoção",
    });
    expect(result.history).toMatchObject({
      member_id: "m1",
      belt: "Azul",
      degree: 2,
    });
    expect(result.memberPatch).toEqual({
      current_belt: "Azul",
      current_degree: 2,
    });
  });
});
```

- [ ] **Step 2: Implementar + action com assert `graduate` + notification**

- [ ] **Step 3: UI listar histórico + formulário**

- [ ] **Step 4: Commit**

```bash
git add lib/graduations actions/graduations.ts app/(app)/graduations tests/graduation.test.ts
git commit -m "feat: append-only graduations"
```

---

### Task 12: Dashboard + Stats (Recharts)

**Files:**
- Create: `actions/dashboard.ts` ou `lib/dashboard/queries.ts`
- Create: `app/(app)/home/page.tsx` (real)
- Create: `app/(app)/stats/page.tsx`
- Create: `components/dashboard/*`

- [ ] **Step 1: Queries** — total alunos ativos, professores, turmas, presenças do dia/mês, novos alunos, graduações do mês, últimas graduações/presenças, alunos inativos.

- [ ] **Step 2: Home UI** — glass balance-style card + quick actions (Abrir aula / Membros / Avisos) + listas recentes.

- [ ] **Step 3: Stats** — gráficos: alunos por faixa, presenças do mês, evolução, graduações do ano (Recharts). Assert `view_dashboard` (student vê empty/redirect).

- [ ] **Step 4: Commit**

```bash
git add actions/dashboard.ts lib/dashboard app/(app)/home app/(app)/stats components/dashboard
git commit -m "feat: dashboard metrics and stats charts"
```

---

### Task 13: Announcements + notifications

**Files:**
- Create: `actions/announcements.ts`, `actions/notifications.ts`
- Create: `app/(app)/announcements/page.tsx`, `app/(app)/notifications/page.tsx`
- Create: `app/(app)/menu/page.tsx`, `app/(app)/profile/page.tsx`

- [ ] **Step 1: CRUD avisos** (`manage_announcements`) + ao criar, opcionalmente fan-out notifications para members ativos.

- [ ] **Step 2: Lista notificações** + marcar lida; badge no header Home.

- [ ] **Step 3: Menu + Profile** pages ligando todas as rotas.

- [ ] **Step 4: Commit**

```bash
git add actions/announcements.ts actions/notifications.ts app/(app)/announcements app/(app)/notifications app/(app)/menu app/(app)/profile
git commit -m "feat: announcements, notifications, menu and profile"
```

---

### Task 14: PWA + polish + permission hardening

**Files:**
- Modify: `next.config.ts`, `app/manifest.ts`, icons em `public/`
- Modify: layouts/actions para guards faltantes

- [ ] **Step 1: `app/manifest.ts`** name “BJJ Manager”, display standalone, theme_color `#070b16`.

- [ ] **Step 2: Configurar PWA** (`@ducanh2912/next-pwa` ou Serwist) — instalável no mobile.

- [ ] **Step 3: Audit** — toda Server Action chama `assertCapability`; rotas sensíveis redirect.

- [ ] **Step 4: Empty states + toasts + loading** premium.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: PWA manifest and permission/UI polish"
```

---

### Task 15: Verification end-to-end manual

- [ ] **Step 1: Checklist do spec §10**

1. Signup → create academy → Home  
2. Segundo usuário student → select/join (via member link) → vê check-in  
3. Instructor abre aula → student request → approve → record  
4. Manual attendance  
5. Graduação append-only  
6. Aviso → notification  
7. User academia A não vê dados B (conta teste)  
8. PWA “Add to Home Screen”

- [ ] **Step 2: `npm test` verde**

- [ ] **Step 3: Push**

```bash
git push origin HEAD
```

---

## Spec coverage check

| Spec area | Tasks |
|-----------|-------|
| Architecture / stack | 1–4 |
| Data model + RLS | 3 |
| Permissions (sem receptionist; instructor manage members) | 5, 8, 14 |
| Auth + multi-tenant | 4, 6, 7 |
| Units / academy | 7 |
| Classes / schedules | 9 |
| Sessions + tap check-in (sem QR) | 10 |
| Graduations append-only | 11 |
| Dashboard / charts | 12 |
| Announcements / notifications | 13 |
| UI premium + bottom nav + FAB check-in | 2, 12, 14 |
| PWA | 14 |
| Verification | 15 |

**Fora de escopo confirmado:** QR, receptionist, pagamentos, eventos.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-16-bjj-manager-mvp.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — um subagent fresco por task, review entre tasks  
2. **Inline Execution** — executar as tasks nesta sessão com checkpoints  

**Which approach?**
