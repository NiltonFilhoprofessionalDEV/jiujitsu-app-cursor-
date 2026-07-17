# Sala Virtual (YouTube) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que staff publique aulas YouTube e alunos assistam in-app no módulo `/classroom`, com RLS multi-tenant e visibilidade academia/turma.

**Architecture:** Migration `virtual_lessons` + `class_members` com RLS; Server Actions espelhando announcements; parse YouTube (watch/youtu.be/shorts); páginas list + new + player; capabilities na matriz existente.

**Tech Stack:** Next.js App Router, Server Actions, Supabase (Postgres + RLS), Zod, Vitest, Tailwind + shadcn existentes.

**Spec:** `docs/superpowers/specs/2026-07-16-virtual-classroom-design.md`

**Pré-requisito do operador:** aplicar `supabase/migrations/0004_virtual_classroom.sql` no SQL Editor do Supabase antes de testar o fluxo autenticado.

---

## File structure (mapa)

```
lib/youtube/parse.ts
lib/validations/classroom.ts
lib/permissions/capabilities.ts          # modify
types/domain.ts                          # modify
actions/classroom.ts
actions/class-members.ts
app/(app)/classroom/page.tsx
app/(app)/classroom/new/page.tsx
app/(app)/classroom/new/new-lesson-form.tsx
app/(app)/classroom/[id]/page.tsx
app/(app)/classroom/[id]/youtube-player.tsx
app/(app)/classroom/classroom-filters.tsx
app/(app)/classes/[id]/class-roster.tsx   # enroll UI mínima
app/(app)/menu/page.tsx                  # modify
lib/supabase/middleware.ts               # modify
actions/classes.ts                       # optional: export list for form select (reuse listClasses)
supabase/migrations/0004_virtual_classroom.sql
tests/youtube-parse.test.ts
tests/permissions.test.ts                # extend
```

---

### Task 1: YouTube ID parser (TDD)

**Files:**
- Create: `lib/youtube/parse.ts`
- Create: `tests/youtube-parse.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/youtube-parse.test.ts
import { describe, it, expect } from "vitest";
import { extractYoutubeId } from "@/lib/youtube/parse";

describe("extractYoutubeId", () => {
  it("parses watch URLs", () => {
    expect(
      extractYoutubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    ).toBe("dQw4w9WgXcQ");
  });

  it("parses youtu.be short links", () => {
    expect(extractYoutubeId("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ",
    );
  });

  it("parses shorts URLs", () => {
    expect(
      extractYoutubeId("https://www.youtube.com/shorts/dQw4w9WgXcQ"),
    ).toBe("dQw4w9WgXcQ");
  });

  it("parses embed URLs", () => {
    expect(
      extractYoutubeId("https://www.youtube.com/embed/dQw4w9WgXcQ"),
    ).toBe("dQw4w9WgXcQ");
  });

  it("returns null for invalid URLs", () => {
    expect(extractYoutubeId("https://example.com/video")).toBeNull();
    expect(extractYoutubeId("not-a-url")).toBeNull();
    expect(extractYoutubeId("")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/youtube-parse.test.ts`

Expected: FAIL — cannot find module `@/lib/youtube/parse`

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/youtube/parse.ts
const YOUTUBE_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

export function extractYoutubeId(raw: string): string | null {
  const input = raw.trim();
  if (!input) return null;

  try {
    const withProtocol = /^https?:\/\//i.test(input)
      ? input
      : `https://${input}`;
    const url = new URL(withProtocol);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();

    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
      return YOUTUBE_ID_RE.test(id) ? id : null;
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      const v = url.searchParams.get("v");
      if (v && YOUTUBE_ID_RE.test(v)) return v;

      const parts = url.pathname.split("/").filter(Boolean);
      if (
        (parts[0] === "shorts" || parts[0] === "embed" || parts[0] === "live") &&
        parts[1] &&
        YOUTUBE_ID_RE.test(parts[1])
      ) {
        return parts[1];
      }
    }

    return null;
  } catch {
    return null;
  }
}

export function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/youtube-parse.test.ts`

Expected: PASS (all 5 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/youtube/parse.ts tests/youtube-parse.test.ts
git commit -m "$(cat <<'EOF'
feat(classroom): add YouTube ID parser with tests

EOF
)"
```

On Windows PowerShell, if heredoc fails, use:

```powershell
git add lib/youtube/parse.ts tests/youtube-parse.test.ts
git commit -m "feat(classroom): add YouTube ID parser with tests"
```

---

### Task 2: Permissions matrix

**Files:**
- Modify: `types/domain.ts`
- Modify: `lib/permissions/capabilities.ts`
- Modify: `tests/permissions.test.ts`

- [ ] **Step 1: Extend Capability union in `types/domain.ts`**

Add to the `Capability` union (keep existing entries):

```ts
  | "manage_announcements"
  | "view_announcements"
  | "manage_virtual_lessons"
  | "view_virtual_lessons";
```

- [ ] **Step 2: Update matrix in `lib/permissions/capabilities.ts`**

Add `"manage_virtual_lessons"` and `"view_virtual_lessons"` to:
- `owner`, `administrator`, `instructor` (both manage + view)

Add only `"view_virtual_lessons"` to:
- `assistant_instructor`, `student`, `guardian`

Example for student line after change:

```ts
  student: ["self_checkin", "view_announcements", "view_virtual_lessons"],
```

Example for assistant:

```ts
  assistant_instructor: [
    "view_members",
    "open_session",
    "manual_attendance",
    "view_announcements",
    "view_virtual_lessons",
  ],
```

- [ ] **Step 3: Extend `tests/permissions.test.ts`**

```ts
  it("allows instructor manage_virtual_lessons", () => {
    expect(can("instructor", "manage_virtual_lessons")).toBe(true);
  });

  it("denies student manage_virtual_lessons", () => {
    expect(can("student", "manage_virtual_lessons")).toBe(false);
  });

  it("allows student view_virtual_lessons", () => {
    expect(can("student", "view_virtual_lessons")).toBe(true);
  });

  it("denies assistant_instructor manage_virtual_lessons", () => {
    expect(can("assistant_instructor", "manage_virtual_lessons")).toBe(false);
  });
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/permissions.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add types/domain.ts lib/permissions/capabilities.ts tests/permissions.test.ts
git commit -m "feat(classroom): add virtual lesson capabilities"
```

---

### Task 3: Migration `0004_virtual_classroom.sql`

**Files:**
- Create: `supabase/migrations/0004_virtual_classroom.sql`

- [ ] **Step 1: Write full migration**

```sql
-- Virtual classroom (YouTube lessons) + class roster for class-scoped visibility

create type public.virtual_lesson_orientation as enum ('horizontal', 'vertical');
create type public.virtual_lesson_visibility as enum ('academy', 'class');

create table public.class_members (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  member_id uuid not null references public.academy_members(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (class_id, member_id)
);

create index class_members_class_id_idx on public.class_members (class_id);
create index class_members_member_id_idx on public.class_members (member_id);

create table public.virtual_lessons (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  title text not null,
  description text,
  youtube_url text not null,
  youtube_video_id text not null,
  orientation public.virtual_lesson_orientation not null default 'horizontal',
  class_id uuid references public.classes(id) on delete set null,
  visibility public.virtual_lesson_visibility not null default 'academy',
  is_published boolean not null default true,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint virtual_lessons_class_visibility_check check (
    visibility <> 'class' or class_id is not null
  )
);

create index virtual_lessons_academy_id_idx on public.virtual_lessons (academy_id);
create index virtual_lessons_class_id_idx on public.virtual_lessons (class_id);

alter table public.class_members enable row level security;
alter table public.virtual_lessons enable row level security;

-- Helper: viewer's academy_members.id for an academy
create or replace function public.current_academy_member_id(p_academy_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select am.id
  from public.academy_members am
  where am.academy_id = p_academy_id
    and am.profile_id = auth.uid()
    and am.status = 'active'
  limit 1;
$$;

revoke all on function public.current_academy_member_id(uuid) from public;
grant execute on function public.current_academy_member_id(uuid) to authenticated;

-- class_members policies
create policy class_members_select on public.class_members
  for select using (
    exists (
      select 1 from public.classes c
      where c.id = class_id
        and public.is_academy_member(c.academy_id)
    )
  );

create policy class_members_insert_staff on public.class_members
  for insert with check (
    exists (
      select 1 from public.classes c
      where c.id = class_id
        and public.has_academy_role(
          c.academy_id,
          array['owner', 'administrator', 'instructor']::public.member_role[]
        )
    )
  );

create policy class_members_delete_staff on public.class_members
  for delete using (
    exists (
      select 1 from public.classes c
      where c.id = class_id
        and public.has_academy_role(
          c.academy_id,
          array['owner', 'administrator', 'instructor']::public.member_role[]
        )
    )
  );

-- virtual_lessons SELECT
create policy virtual_lessons_select on public.virtual_lessons
  for select using (
    public.is_academy_member(academy_id)
    and (
      -- staff (owner/admin/instructor/assistant) see all in academy
      public.has_academy_role(
        academy_id,
        array[
          'owner',
          'administrator',
          'instructor',
          'assistant_instructor'
        ]::public.member_role[]
      )
      or (
        is_published = true
        and (
          visibility = 'academy'
          or (
            visibility = 'class'
            and class_id is not null
            and exists (
              select 1
              from public.class_members cm
              where cm.class_id = virtual_lessons.class_id
                and cm.member_id = public.current_academy_member_id(
                  virtual_lessons.academy_id
                )
            )
          )
        )
      )
    )
  );

create policy virtual_lessons_insert_staff on public.virtual_lessons
  for insert with check (
    public.has_academy_role(
      academy_id,
      array['owner', 'administrator', 'instructor']::public.member_role[]
    )
    and created_by = auth.uid()
  );

create policy virtual_lessons_update_staff on public.virtual_lessons
  for update using (
    public.has_academy_role(
      academy_id,
      array['owner', 'administrator', 'instructor']::public.member_role[]
    )
  );

create policy virtual_lessons_delete_staff on public.virtual_lessons
  for delete using (
    public.has_academy_role(
      academy_id,
      array['owner', 'administrator', 'instructor']::public.member_role[]
    )
  );
```

- [ ] **Step 2: Operator applies SQL in Supabase SQL Editor** (manual — document in PR/notes; agent cannot apply remotely without credentials).

- [ ] **Step 3: Commit**

```powershell
git add supabase/migrations/0004_virtual_classroom.sql
git commit -m "feat(classroom): add virtual_lessons and class_members migration"
```

---

### Task 4: Zod validation

**Files:**
- Create: `lib/validations/classroom.ts`

- [ ] **Step 1: Create schema**

```ts
// lib/validations/classroom.ts
import { z } from "zod";
import { extractYoutubeId } from "@/lib/youtube/parse";

const uuidOrEmpty = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : v))
  .pipe(z.string().uuid().optional());

export const createVirtualLessonSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Título é obrigatório")
      .max(120, "Título muito longo"),
    description: z
      .string()
      .trim()
      .max(2000, "Descrição muito longa")
      .optional()
      .transform((v) => (v && v.length > 0 ? v : undefined)),
    youtube_url: z
      .string()
      .trim()
      .min(1, "Link do YouTube é obrigatório")
      .max(500, "Link muito longo"),
    orientation: z.enum(["horizontal", "vertical"], {
      errorMap: () => ({ message: "Orientação inválida" }),
    }),
    visibility: z.enum(["academy", "class"], {
      errorMap: () => ({ message: "Visibilidade inválida" }),
    }),
    class_id: uuidOrEmpty,
  })
  .superRefine((data, ctx) => {
    const videoId = extractYoutubeId(data.youtube_url);
    if (!videoId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["youtube_url"],
        message: "Link do YouTube inválido",
      });
    }
    if (data.visibility === "class" && !data.class_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["class_id"],
        message: "Selecione a turma para visibilidade restrita",
      });
    }
  })
  .transform((data) => {
    const youtube_video_id = extractYoutubeId(data.youtube_url)!;
    return {
      ...data,
      youtube_video_id,
      description: data.description ?? null,
      class_id: data.class_id ?? null,
    };
  });

export type CreateVirtualLessonInput = z.infer<
  typeof createVirtualLessonSchema
>;
```

- [ ] **Step 2: Commit**

```powershell
git add lib/validations/classroom.ts
git commit -m "feat(classroom): add Zod schema for virtual lessons"
```

---

### Task 5: Server actions — classroom

**Files:**
- Create: `actions/classroom.ts`

- [ ] **Step 1: Implement list / get / create / soft-unpublish (delete = set is_published false optional; prefer hard delete for staff)**

```ts
// actions/classroom.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  assertCapability,
  getActiveMembership,
  PermissionError,
} from "@/lib/permissions/assert";
import { can } from "@/lib/permissions/capabilities";
import { createClient } from "@/lib/supabase/server";
import { createVirtualLessonSchema } from "@/lib/validations/classroom";

export type ClassroomActionState = {
  error?: string;
  success?: string;
} | null;

export type VirtualLessonRow = {
  id: string;
  title: string;
  description: string | null;
  youtube_url: string;
  youtube_video_id: string;
  orientation: "horizontal" | "vertical";
  visibility: "academy" | "class";
  class_id: string | null;
  class_name: string | null;
  is_published: boolean;
  created_at: string;
  created_by_name: string;
};

function firstValidationError(error: {
  flatten: () => {
    formErrors: string[];
    fieldErrors: Record<string, string[] | undefined>;
  };
}): string {
  const flat = error.flatten();
  const fieldMessage = Object.values(flat.fieldErrors).flat().find(Boolean);
  return fieldMessage ?? flat.formErrors[0] ?? "Dados inválidos";
}

function mapLessonRow(row: Record<string, unknown>): VirtualLessonRow {
  const profile = row.profiles as
    | { name: string }
    | { name: string }[]
    | null;
  const author = Array.isArray(profile) ? profile[0] : profile;
  const classRel = row.classes as
    | { name: string }
    | { name: string }[]
    | null;
  const classObj = Array.isArray(classRel) ? classRel[0] : classRel;

  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string | null) ?? null,
    youtube_url: row.youtube_url as string,
    youtube_video_id: row.youtube_video_id as string,
    orientation: row.orientation as "horizontal" | "vertical",
    visibility: row.visibility as "academy" | "class",
    class_id: (row.class_id as string | null) ?? null,
    class_name: classObj?.name ?? null,
    is_published: row.is_published as boolean,
    created_at: row.created_at as string,
    created_by_name: author?.name ?? "Equipe",
  };
}

const LESSON_SELECT = `
  id,
  title,
  description,
  youtube_url,
  youtube_video_id,
  orientation,
  visibility,
  class_id,
  is_published,
  created_at,
  created_by,
  profiles!created_by(name),
  classes!class_id(name)
`;

export async function listVirtualLessons(options?: {
  classId?: string;
}): Promise<VirtualLessonRow[]> {
  const member = await getActiveMembership();
  if (!can(member.role, "view_virtual_lessons")) {
    throw new PermissionError(member.role, "view_virtual_lessons");
  }

  const supabase = await createClient();
  let query = supabase
    .from("virtual_lessons")
    .select(LESSON_SELECT)
    .eq("academy_id", member.academy_id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (options?.classId) {
    query = query.eq("class_id", options.classId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row) => mapLessonRow(row as Record<string, unknown>));
}

export async function getVirtualLesson(
  id: string,
): Promise<VirtualLessonRow | null> {
  const member = await getActiveMembership();
  if (!can(member.role, "view_virtual_lessons")) {
    throw new PermissionError(member.role, "view_virtual_lessons");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("virtual_lessons")
    .select(LESSON_SELECT)
    .eq("id", id)
    .eq("academy_id", member.academy_id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapLessonRow(data as Record<string, unknown>);
}

export async function createVirtualLesson(
  _prevState: ClassroomActionState,
  formData: FormData,
): Promise<ClassroomActionState> {
  try {
    const actor = await assertCapability("manage_virtual_lessons");

    const parsed = createVirtualLessonSchema.safeParse({
      title: formData.get("title"),
      description: formData.get("description") ?? undefined,
      youtube_url: formData.get("youtube_url"),
      orientation: formData.get("orientation"),
      visibility: formData.get("visibility"),
      class_id: formData.get("class_id") ?? undefined,
    });

    if (!parsed.success) {
      return { error: firstValidationError(parsed.error) };
    }

    const supabase = await createClient();

    if (parsed.data.class_id) {
      const { data: klass, error: classError } = await supabase
        .from("classes")
        .select("id")
        .eq("id", parsed.data.class_id)
        .eq("academy_id", actor.academy_id)
        .maybeSingle();

      if (classError) return { error: classError.message };
      if (!klass) return { error: "Turma inválida para esta academia." };
    }

    const { data: inserted, error: insertError } = await supabase
      .from("virtual_lessons")
      .insert({
        academy_id: actor.academy_id,
        title: parsed.data.title,
        description: parsed.data.description,
        youtube_url: parsed.data.youtube_url,
        youtube_video_id: parsed.data.youtube_video_id,
        orientation: parsed.data.orientation,
        visibility: parsed.data.visibility,
        class_id: parsed.data.class_id,
        is_published: true,
        created_by: actor.profile_id,
      })
      .select("id")
      .single();

    if (insertError) {
      return { error: insertError.message };
    }

    revalidatePath("/classroom");
    redirect(`/classroom/${inserted.id}`);
  } catch (err) {
    if (err instanceof PermissionError) {
      return { error: "Sem permissão para publicar aulas virtuais." };
    }
    // Next.js redirect throws; rethrow
    if (
      err &&
      typeof err === "object" &&
      "digest" in err &&
      String((err as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw err;
    }
    return {
      error:
        err instanceof Error
          ? err.message
          : "Não foi possível publicar a aula.",
    };
  }
}

export async function deleteVirtualLesson(
  lessonId: string,
): Promise<{ error?: string }> {
  try {
    await assertCapability("manage_virtual_lessons");
    const member = await getActiveMembership();
    const supabase = await createClient();

    const { error } = await supabase
      .from("virtual_lessons")
      .delete()
      .eq("id", lessonId)
      .eq("academy_id", member.academy_id);

    if (error) return { error: error.message };

    revalidatePath("/classroom");
    revalidatePath(`/classroom/${lessonId}`);
    return {};
  } catch (err) {
    if (err instanceof PermissionError) {
      return { error: "Sem permissão." };
    }
    return {
      error: err instanceof Error ? err.message : "Erro ao remover aula.",
    };
  }
}
```

**Note on redirect:** `createVirtualLesson` uses `redirect()` after insert. Prefer returning `{ success }` + client `router.push` if redirect-in-action causes issues with `useActionState` — match whatever pattern `actions/classes.ts` uses for create+redirect. Inspect `createClass` and copy the same redirect/error handling style.

- [ ] **Step 2: Commit**

```powershell
git add actions/classroom.ts
git commit -m "feat(classroom): add list/get/create/delete virtual lesson actions"
```

---

### Task 6: Server actions — class_members

**Files:**
- Create: `actions/class-members.ts`
- Modify: `app/(app)/classes/[id]/page.tsx` (add roster section)
- Create: `app/(app)/classes/[id]/class-roster.tsx`

- [ ] **Step 1: Implement actions**

```ts
// actions/class-members.ts
"use server";

import { revalidatePath } from "next/cache";
import {
  assertCapability,
  getActiveMembership,
  PermissionError,
} from "@/lib/permissions/assert";
import { createClient } from "@/lib/supabase/server";

export type ClassMemberRow = {
  id: string;
  member_id: string;
  member_name: string;
};

export async function listClassMembers(
  classId: string,
): Promise<ClassMemberRow[]> {
  await assertCapability("manage_classes");
  const member = await getActiveMembership();
  const supabase = await createClient();

  const { data: klass } = await supabase
    .from("classes")
    .select("id")
    .eq("id", classId)
    .eq("academy_id", member.academy_id)
    .maybeSingle();

  if (!klass) return [];

  const { data, error } = await supabase
    .from("class_members")
    .select(
      `
      id,
      member_id,
      academy_members!member_id(
        profiles!profile_id(name)
      )
    `,
    )
    .eq("class_id", classId);

  if (error) throw error;

  return (data ?? []).map((row) => {
    const am = row.academy_members as
      | { profiles: { name: string } | { name: string }[] | null }
      | { profiles: { name: string } | { name: string }[] | null }[]
      | null;
    const amObj = Array.isArray(am) ? am[0] : am;
    const profile = amObj?.profiles;
    const author = Array.isArray(profile) ? profile[0] : profile;
    return {
      id: row.id as string,
      member_id: row.member_id as string,
      member_name: author?.name ?? "Membro",
    };
  });
}

export async function addClassMember(
  classId: string,
  academyMemberId: string,
): Promise<{ error?: string }> {
  try {
    await assertCapability("manage_classes");
    const actor = await getActiveMembership();
    const supabase = await createClient();

    const { data: klass } = await supabase
      .from("classes")
      .select("id")
      .eq("id", classId)
      .eq("academy_id", actor.academy_id)
      .maybeSingle();
    if (!klass) return { error: "Turma não encontrada." };

    const { data: target } = await supabase
      .from("academy_members")
      .select("id")
      .eq("id", academyMemberId)
      .eq("academy_id", actor.academy_id)
      .maybeSingle();
    if (!target) return { error: "Membro inválido." };

    const { error } = await supabase.from("class_members").insert({
      class_id: classId,
      member_id: academyMemberId,
    });

    if (error) {
      if (error.code === "23505") return { error: "Já está na turma." };
      return { error: error.message };
    }

    revalidatePath(`/classes/${classId}`);
    revalidatePath("/classroom");
    return {};
  } catch (err) {
    if (err instanceof PermissionError) return { error: "Sem permissão." };
    return {
      error: err instanceof Error ? err.message : "Erro ao adicionar.",
    };
  }
}

export async function removeClassMember(
  classId: string,
  classMemberRowId: string,
): Promise<{ error?: string }> {
  try {
    await assertCapability("manage_classes");
    const actor = await getActiveMembership();
    const supabase = await createClient();

    const { data: klass } = await supabase
      .from("classes")
      .select("id")
      .eq("id", classId)
      .eq("academy_id", actor.academy_id)
      .maybeSingle();
    if (!klass) return { error: "Turma não encontrada." };

    const { error } = await supabase
      .from("class_members")
      .delete()
      .eq("id", classMemberRowId)
      .eq("class_id", classId);

    if (error) return { error: error.message };

    revalidatePath(`/classes/${classId}`);
    revalidatePath("/classroom");
    return {};
  } catch (err) {
    if (err instanceof PermissionError) return { error: "Sem permissão." };
    return {
      error: err instanceof Error ? err.message : "Erro ao remover.",
    };
  }
}
```

- [ ] **Step 2: Add minimal roster UI on class detail**

Read `app/(app)/classes/[id]/page.tsx` fully, then add a staff-only section that:
1. Calls `listClassMembers(classId)` when `can(role, "manage_classes")`
2. Renders `ClassRoster` client component with a `<select>` of active academy students (reuse `listMembers` or query from existing members action) + add/remove buttons

Keep the roster UI small (~80 lines). If `listMembers` does not exist as a reusable export, use a minimal select of `academy_members` where `role = 'student'` via a new `listAcademyStudentsForRoster()` in the same `actions/class-members.ts` file.

- [ ] **Step 3: Commit**

```powershell
git add actions/class-members.ts app/(app)/classes/[id]/
git commit -m "feat(classroom): add class roster for class-scoped lessons"
```

---

### Task 7: Middleware + Menu link

**Files:**
- Modify: `lib/supabase/middleware.ts`
- Modify: `app/(app)/menu/page.tsx`

- [ ] **Step 1: Add `"/classroom"` to `PROTECTED_PREFIXES`**

```ts
  "/announcements",
  "/notifications",
  "/classroom",
  "/academy",
```

- [ ] **Step 2: Add Menu item**

Import `Clapperboard` (or `MonitorPlay`) from `lucide-react`.

```ts
    {
      href: "/classroom",
      label: "Sala virtual",
      icon: Clapperboard,
      show: can(membership.role, "view_virtual_lessons"),
    },
```

Place after Avisos (before Notificações).

- [ ] **Step 3: Commit**

```powershell
git add lib/supabase/middleware.ts app/(app)/menu/page.tsx
git commit -m "feat(classroom): protect /classroom and add menu link"
```

---

### Task 8: List page `/classroom`

**Files:**
- Create: `app/(app)/classroom/page.tsx`
- Create: `app/(app)/classroom/classroom-filters.tsx` (optional client filter chips)

- [ ] **Step 1: Implement list page**

```tsx
// app/(app)/classroom/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { Play } from "lucide-react";
import { listVirtualLessons } from "@/actions/classroom";
import { listClasses } from "@/actions/classes";
import { getActiveMembership } from "@/lib/permissions/assert";
import { can } from "@/lib/permissions/capabilities";
import { EmptyState } from "@/components/ui/empty-state";
import { ClassroomFilters } from "./classroom-filters";

export default async function ClassroomPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string }>;
}) {
  let membership;
  try {
    membership = await getActiveMembership();
  } catch {
    redirect("/select-academy");
  }

  if (!can(membership.role, "view_virtual_lessons")) {
    redirect("/home");
  }

  const canManage = can(membership.role, "manage_virtual_lessons");
  const params = await searchParams;
  const classId = params.classId;

  const [lessons, classes] = await Promise.all([
    listVirtualLessons(classId ? { classId } : undefined),
    listClasses(),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--bjj-text)]">
            Sala virtual
          </h1>
          <p className="text-sm text-[var(--bjj-muted)]">
            Aulas em vídeo da academia
          </p>
        </div>
        {canManage ? (
          <Link
            href="/classroom/new"
            className="inline-flex h-11 shrink-0 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Publicar
          </Link>
        ) : null}
      </header>

      <ClassroomFilters
        classes={classes.map((c) => ({ id: c.id, name: c.name }))}
        activeClassId={classId}
      />

      <section className="space-y-2">
        {lessons.length === 0 ? (
          <EmptyState
            title="Nenhuma aula publicada"
            description="Links do YouTube publicados pela equipe aparecem aqui."
            actionHref={canManage ? "/classroom/new" : undefined}
            actionLabel={canManage ? "Publicar aula" : undefined}
          />
        ) : (
          lessons.map((lesson) => (
            <Link
              key={lesson.id}
              href={`/classroom/${lesson.id}`}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 backdrop-blur-xl transition hover:bg-muted"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--action-red)]/15">
                <Play className="h-5 w-5 text-[var(--action-red)]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-foreground">
                  {lesson.title}
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {lesson.orientation === "vertical"
                    ? "Vertical"
                    : "Horizontal"}
                  {lesson.class_name ? ` · ${lesson.class_name}` : ""}
                  {lesson.visibility === "class" ? " · Só turma" : ""}
                </p>
              </div>
            </Link>
          ))
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Filters client component**

```tsx
// app/(app)/classroom/classroom-filters.tsx
"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export function ClassroomFilters({
  classes,
  activeClassId,
}: {
  classes: { id: string; name: string }[];
  activeClassId?: string;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      <Link
        href="/classroom"
        className={cn(
          "shrink-0 rounded-full border px-3 py-1.5 text-xs",
          !activeClassId
            ? "border-[var(--action-red)] bg-[var(--action-red)]/10 text-foreground"
            : "border-border text-muted-foreground",
        )}
      >
        Todas
      </Link>
      {classes.map((c) => (
        <Link
          key={c.id}
          href={`/classroom?classId=${c.id}`}
          className={cn(
            "shrink-0 rounded-full border px-3 py-1.5 text-xs",
            activeClassId === c.id
              ? "border-[var(--action-red)] bg-[var(--action-red)]/10 text-foreground"
              : "border-border text-muted-foreground",
          )}
        >
          {c.name}
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```powershell
git add app/(app)/classroom/page.tsx app/(app)/classroom/classroom-filters.tsx
git commit -m "feat(classroom): add virtual classroom list page"
```

---

### Task 9: Publish form `/classroom/new`

**Files:**
- Create: `app/(app)/classroom/new/page.tsx`
- Create: `app/(app)/classroom/new/new-lesson-form.tsx`

- [ ] **Step 1: Page (server)**

```tsx
// app/(app)/classroom/new/page.tsx
import { redirect } from "next/navigation";
import { listClasses } from "@/actions/classes";
import { getActiveMembership } from "@/lib/permissions/assert";
import { can } from "@/lib/permissions/capabilities";
import { NewLessonForm } from "./new-lesson-form";

export default async function NewVirtualLessonPage() {
  let membership;
  try {
    membership = await getActiveMembership();
  } catch {
    redirect("/select-academy");
  }

  if (!can(membership.role, "manage_virtual_lessons")) {
    redirect("/classroom");
  }

  const classes = await listClasses();

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--bjj-text)]">
          Publicar aula
        </h1>
        <p className="text-sm text-[var(--bjj-muted)]">
          Cole um link do YouTube para embed in-app
        </p>
      </header>
      <section className="space-y-3 rounded-2xl border border-border bg-card p-4 backdrop-blur-xl">
        <NewLessonForm
          classes={classes.map((c) => ({ id: c.id, name: c.name }))}
        />
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Form (client)** — mirror `new-announcement-form.tsx` with fields:
  - `title`, `description`, `youtube_url`
  - `orientation`: radio/select `horizontal` | `vertical`
  - `class_id`: optional `<select>` with empty option “Nenhuma (geral)”
  - `visibility`: `academy` | `class`
  - Submit → `createVirtualLesson`

Use `useActionState` + sonner toasts. Labels in Portuguese.

- [ ] **Step 3: Commit**

```powershell
git add app/(app)/classroom/new/
git commit -m "feat(classroom): add publish virtual lesson form"
```

---

### Task 10: Player detail `/classroom/[id]`

**Files:**
- Create: `app/(app)/classroom/[id]/page.tsx`
- Create: `app/(app)/classroom/[id]/youtube-player.tsx`

- [ ] **Step 1: Player client component**

```tsx
// app/(app)/classroom/[id]/youtube-player.tsx
"use client";

import { useState } from "react";
import { youtubeEmbedUrl } from "@/lib/youtube/parse";
import { cn } from "@/lib/utils";

export function YoutubePlayer({
  videoId,
  orientation,
  title,
}: {
  videoId: string;
  orientation: "horizontal" | "vertical";
  title: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = youtubeEmbedUrl(videoId);

  if (failed) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        Este vídeo não permite reprodução no app. Verifique se está público ou
        unlisted com embed liberado.
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mx-auto w-full overflow-hidden rounded-2xl border border-border bg-black",
        orientation === "horizontal"
          ? "aspect-video max-w-full"
          : "aspect-[9/16] max-h-[70vh] max-w-[min(100%,360px)]",
      )}
    >
      <iframe
        title={title}
        src={src}
        className="h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        onError={() => setFailed(true)}
      />
    </div>
  );
}
```

Note: iframes often do not fire `onError` for embed blocks; the static fallback message above is also shown as copy under the player in the page if needed. Keep the message from the spec.

- [ ] **Step 2: Detail page**

```tsx
// app/(app)/classroom/[id]/page.tsx
import { notFound, redirect } from "next/navigation";
import { getVirtualLesson } from "@/actions/classroom";
import { getActiveMembership } from "@/lib/permissions/assert";
import { can } from "@/lib/permissions/capabilities";
import { YoutubePlayer } from "./youtube-player";

export default async function ClassroomLessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  let membership;
  try {
    membership = await getActiveMembership();
  } catch {
    redirect("/select-academy");
  }

  if (!can(membership.role, "view_virtual_lessons")) {
    redirect("/home");
  }

  const { id } = await params;
  const lesson = await getVirtualLesson(id);
  if (!lesson) notFound();

  return (
    <div className="space-y-6">
      <YoutubePlayer
        videoId={lesson.youtube_video_id}
        orientation={lesson.orientation}
        title={lesson.title}
      />
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--bjj-text)]">
          {lesson.title}
        </h1>
        {lesson.description ? (
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {lesson.description}
          </p>
        ) : null}
        <p className="text-[10px] text-muted-foreground">
          {lesson.class_name ? `${lesson.class_name} · ` : ""}
          Por {lesson.created_by_name}
        </p>
        <p className="text-xs text-muted-foreground">
          Se o vídeo não carregar: este vídeo não permite reprodução no app.
          Verifique se está público ou unlisted com embed liberado.
        </p>
      </header>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```powershell
git add app/(app)/classroom/[id]/
git commit -m "feat(classroom): add in-app YouTube player detail page"
```

---

### Task 11: Manual verification (spec §10)

After applying migration `0004` in Supabase:

- [ ] Staff (instructor) cria aula horizontal, visibility `academy` → aluno vê e reproduz em `/classroom/[id]`
- [ ] Staff cria aula vertical/Shorts → layout 9:16
- [ ] Aula `visibility=class` oculta para aluno fora de `class_members`; visível após enroll no roster
- [ ] Student não vê botão Publicar / acessar `/classroom/new` redireciona
- [ ] Assistant não publica
- [ ] Link inválido rejeitado no form (toast de erro)

Run unit tests:

```powershell
npx vitest run tests/youtube-parse.test.ts tests/permissions.test.ts
```

Expected: all PASS

- [ ] **Final commit** only if leftover polish files remain; otherwise skip empty commit.

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| Módulo dedicado + embed | 8, 9, 10 |
| Publishers Owner/Admin/Instructor | 2, 5 |
| Híbrido geral + turma | 3, 5, 8, 9 |
| Visibility academy/class | 3, 4, 5 |
| Student watch-only | 8, 10 (no progress/comments) |
| Orientation H/V | 3, 4, 9, 10 |
| class_members minimal | 3, 6 |
| Menu Sala virtual | 7 |
| Invalid URL Zod | 1, 4 |
| Embed error copy | 10 |
| Capabilities names | 2 |

**Placeholder scan:** none intentional — Task 6 Step 2 requires reading existing class detail page at implement time (path known).

**Type consistency:** `orientation` / `visibility` / `VirtualLessonRow` / capabilities names match across tasks.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-16-virtual-classroom.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — execute tasks in this session with checkpoints  

Which approach?
