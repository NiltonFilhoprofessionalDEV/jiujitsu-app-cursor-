# Birthday Alerts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Card de aniversariantes no Home (hoje+7d) e notificação no dia via cron para owner/admin/instructor.

**Architecture:** Helper puro de range → dados no dashboard → widget Home; cron diário com service role + tabela de dedupe + `notify_profile`.

**Tech Stack:** Next.js, Supabase, Vitest, Vercel Cron

**Spec:** `docs/superpowers/specs/2026-07-20-birthday-alerts-design.md`

---

### Task 1: Helper + testes

**Files:**
- Create: `lib/birthdays/range.ts`, `lib/birthdays/message.ts`
- Test: `tests/birthdays.test.ts`

- [ ] TDD: range (7d, virada ano, 29/02, ordenação)
- [ ] TDD: mensagem agregada (1, 2, 3+)

### Task 2: Migration

**Files:**
- Create: `supabase/migrations/0021_birthday_notifications_sent.sql`
- Modify: `supabase/migrations/README.md`

### Task 3: Dashboard data + UI

**Files:**
- Modify: `actions/dashboard.ts`
- Modify: `components/dashboard/home-widgets.tsx` (ou card novo)
- Modify: `components/home/home-ops-client.tsx`, `home-dashboard-client.tsx`

### Task 4: Cron + notification kind

**Files:**
- Create: `app/api/cron/birthday-alerts/route.ts`, `lib/birthdays/run-birthday-alerts.ts`
- Modify: `vercel.json`, `lib/notifications/kind.ts`

### Task 5: Verify

- [ ] `npx tsc --noEmit` + `npm test`
