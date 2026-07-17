# Abertura automática de aulas — Design Spec

**Date:** 2026-07-16  
**Status:** Approved for implementation planning  
**Product:** BJJ Manager  
**Related:** `docs/superpowers/specs/2026-07-16-bjj-manager-design.md`

## 1. Goal

Permitir que o professor configure, **por horário da grade**, a abertura automática da aula X minutos antes do início (padrão 30), e o fechamento automático Y minutos depois do fim (padrão 15), com professor fixo da turma — até desativar o toggle.

## 2. Decisions (brainstorming)

| Topic | Decision |
|-------|----------|
| Approach | Híbrido: config/toggle no app + cron fino (`/api/cron/auto-sessions`) |
| Instructor | Professor fixo da **turma** (`classes.default_instructor_id`) |
| Scope | Config **por horário** (`class_schedules`) |
| Timezone | Fuso na **unidade**; fallback **academia**; último fallback `America/Sao_Paulo` |
| Auto-close | Sim, com folga após `end_time` (`auto_close_grace_minutes`, default 15) |
| Auto-open lead | `auto_open_lead_minutes`, default **30** |
| Manual open | Continua disponível; reusa sessão já aberta do horário/dia |

## 3. Out of scope (v1)

- Notificação push / e-mail ao abrir
- Preview “próxima abertura em …”
- Histórico dedicado de aberturas automáticas
- Auto-open sem professor cadastrado
- Fechar sessão aberta manualmente só porque o toggle foi desligado
- Cron via pg_cron / Edge Function (pode migrar depois; v1 = Vercel Cron + route)

## 4. Architecture

```
Staff → UI turma → Server Actions (toggle, lead, grace, default instructor, timezones)
                 → Postgres (classes / class_schedules / academies / academy_units)

Cron (a cada 2 min) → GET|POST /api/cron/auto-sessions (CRON_SECRET)
                    → createAdminClient (service role)
                    → resolve timezone → open due sessions → close overdue sessions
```

**Open window:** now ∈ `[start − lead, end)` for that schedule’s local date  
**Close window:** now ≥ `end + grace` and session `status = open` with matching `schedule_id` + `date`

## 5. Data model

### academies (add)

| Column | Type | Notes |
|--------|------|-------|
| timezone | text | IANA, default `'America/Sao_Paulo'` |

### academy_units (add)

| Column | Type | Notes |
|--------|------|-------|
| timezone | text nullable | IANA; null → usa academia |

### classes (add)

| Column | Type | Notes |
|--------|------|-------|
| default_instructor_id | uuid FK → academy_members nullable | Professor da abertura automática |

**Constraint (app + DB check where possible):** `default_instructor_id` must belong to same `academy_id` and role in (`owner`, `administrator`, `instructor`, `assistant_instructor`) with `status = active`.

### class_schedules (add)

| Column | Type | Notes |
|--------|------|-------|
| auto_open_enabled | boolean | default false |
| auto_open_lead_minutes | int | default 30; allowed 5–120 |
| auto_close_grace_minutes | int | default 15; allowed 0–60 |

### class_sessions (add)

| Column | Type | Notes |
|--------|------|-------|
| schedule_id | uuid FK → class_schedules nullable | null = sessão só manual / legado |

**Idempotência:** unique parcial  
`UNIQUE (schedule_id, date) WHERE schedule_id IS NOT NULL`

### Migration file

`supabase/migrations/0005_auto_open_sessions.sql` (ajustar número se 0004 já existir no repo alvo).

## 6. Permissions

| Action | Who |
|--------|-----|
| Set default instructor / toggle / lead / grace | Roles with `manage_classes` **or** `open_session` (owner, administrator, instructor) |
| Assistant instructor | Não configura auto-open |
| Cron job | Service role + `CRON_SECRET` only |

No new capability required if existing `manage_classes` / `open_session` cover UI. Prefer gating config writes with `manage_classes`; instructors who only have `open_session` may still toggle if product wants — **v1 gate: `manage_classes` OR `open_session`** as decided in brainstorming.

## 7. Job algorithm

Every run:

1. Load schedules where `auto_open_enabled = true`, join class (active), academy, unit, default instructor.
2. Skip if missing `default_instructor_id` or instructor inactive.
3. Resolve timezone: `unit.timezone` → `academy.timezone` → `America/Sao_Paulo`.
4. Compute “now” and “today” in that timezone; if schedule `weekday` ≠ today, skip open (still may close past sessions).
5. **Open:** if now ∈ `[start − lead, end)` and no row for `(schedule_id, date)` → insert `class_sessions` with `status = 'open'`, `started_at = now()`, `instructor_id = default_instructor_id`, `schedule_id`, `date`.
6. **Close:** find `open` sessions with `schedule_id` set where local now ≥ `end_time + grace` on that session’s `date` → set `status = 'finished'`, `finished_at = now()`.
7. Per-schedule try/catch; aggregate counts in log: `{ opened, closed, skipped, errors }`.

**Toggle off:** no new opens. Existing open sessions close only via grace rule if they were already open, or manual close — **do not** force-close on disable in v1.

## 8. UI

### Class detail `/classes/[id]`

1. **Bloco “Abertura automática”**
   - Select: Professor da abertura automática (staff ativos)
   - Helper: “Usado quando o horário abre sozinho”

2. **Cada horário na grade**
   - Toggle: “Abrir automaticamente”
   - Se on: inputs “Minutos antes” (default 30), “Minutos após o fim” (default 15)
   - Se faltar professor ou fuso inválido: toggle disabled + mensagem objetiva

3. **Academia / Unidades**
   - Campo timezone (select BR comuns + valor IANA livre opcional) no editor de academia e de unidade

### Copy (PT-BR)

- Toggle on: “Abrir automaticamente”
- Lead: “Abrir X min antes”
- Grace: “Fechar X min depois do fim”
- Missing instructor: “Escolha o professor da abertura automática”
- Missing timezone: “Defina o fuso da unidade ou da academia”

## 9. API / Actions

| Piece | Path / name |
|-------|-------------|
| Update class default instructor | `actions/classes.ts` → `updateClassAutoInstructor` (or extend `updateClass`) |
| Update schedule auto settings | `actions/classes.ts` → `updateScheduleAutoOpen` |
| Cron route | `app/api/cron/auto-sessions/route.ts` |
| Cron config | `vercel.json` → schedule `*/2 * * * *` |
| Env | `CRON_SECRET` |
| Pure helpers | `lib/sessions/auto-open.ts` (timezone resolve, window checks) — unit tested |

## 10. Security

- Cron rejects missing/invalid bearer secret (401).
- Service role only inside cron handler; never exposed to client.
- RLS unchanged for interactive users; cron bypasses RLS via admin client intentionally.
- Validate lead/grace ranges server-side (Zod).
- `default_instructor_id` must be same academy + eligible role.

## 11. Success criteria

- [ ] Staff liga toggle num horário, com professor e fuso ok
- [ ] No horário certo (lead), cron cria exatamente uma sessão `open` ligada ao `schedule_id`
- [ ] Após `end + grace`, cron fecha a sessão
- [ ] Segunda execução do cron na mesma janela não duplica sessão
- [ ] Toggle off impede novas aberturas
- [ ] “Abrir aula” manual ainda funciona
- [ ] Light/dark UI consistente com o app; toggle acessível (`aria-checked`)

## 12. Risks / notes

- Vercel Cron availability depends on hosting plan; document operator setup.
- Serverless cold start: 2-minute cadence is enough for “~30 min before”; not second-precise.
- Legacy sessions without `schedule_id` are ignored by auto-close job (manual close only).
- Class without `unit_id` uses academy timezone — acceptable per decision.
