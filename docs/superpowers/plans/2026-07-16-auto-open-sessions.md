# Abertura automática de aulas — Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox syntax.

**Goal:** Permitir auto-open/close de sessões por horário da grade, com professor fixo da turma e cron a cada 2 min.

**Architecture:** Migration + helpers puros testados + Server Actions/UI na turma + `/api/cron/auto-sessions` com service role.

**Tech Stack:** Next.js App Router, Supabase, Zod, Vitest, Vercel Cron

**Spec:** `docs/superpowers/specs/2026-07-16-auto-open-sessions-design.md`

---

### Task 1: Migration + pure helpers + tests
### Task 2: Actions (instructor, schedule auto settings, timezone)
### Task 3: Cron runner + route + vercel.json
### Task 4: UI class detail + academy/unit timezone
### Task 5: Verify tsc + vitest
