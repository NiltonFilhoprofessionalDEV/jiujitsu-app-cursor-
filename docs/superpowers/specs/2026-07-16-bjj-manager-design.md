# BJJ Manager — Design Spec (MVP)

**Date:** 2026-07-16  
**Status:** Approved for implementation planning  
**Source:** `prd.md` + decisões de brainstorming  
**Product name:** BJJ Manager  

## 1. Goal

SaaS multi-tenant PWA para gerenciamento de academias de Jiu-Jitsu: alunos, turmas, aulas, presença, graduações, avisos e notificações — com UI mobile-first premium (dark, glass, FAB central).

## 2. Decisions (brainstorming)

| Topic | Decision |
|-------|----------|
| Scope delivery | MVP completo o mais rápido possível (módulos do PRD na mesma entrega) |
| Backend | Supabase do cliente (URL + keys via `.env`, nunca no chat) |
| Brand | BJJ Manager |
| Layout | Mobile-first PWA (bottom nav + FAB), visual alinhado à referência banking dark |
| Architecture | Next.js App Router + Supabase direto (Server Components / Server Actions + RLS) |
| QR Code | **Adiado.** Check-in por toque em aula aberta |
| Receptionist role | **Removido** do MVP |
| Instructor | Pode cadastrar/consultar alunos além de aulas, presença e graduação |

## 3. Out of scope (MVP)

- Pagamentos
- Campeonatos / eventos
- QR Code (schema opcional reservado; sem UI/fluxo)
- Role Receptionist

## 4. Architecture

```
[PWA Next.js] ──Auth──▶ [Supabase Auth]
       │
       ├── Server Components / Server Actions
       │         ▼
       │   [PostgreSQL + RLS]
       │   academies → units → members
       │   classes → schedules → sessions
       │   attendance_requests → attendance_records
       │   belt_levels → graduation_history
       │   announcements + notifications
       │
       └── Realtime (lista de presença pending)
           Storage (logos / certificados)
```

### 4.1 Multi-tenant

- Toda tabela de negócio carrega `academy_id` (direta ou via FK).
- Usuário escolhe **academia ativa** (cookie/session); pode ser membro de várias.
- RLS: só dados de academias onde `academy_members.profile_id = auth.uid()` e status adequado.
- Server Actions sempre validam `academy_id` ativo + role.

### 4.2 Auth

- Email/senha (Supabase Auth).
- Trigger em `auth.users` cria row em `profiles`.
- Sem membership: fluxo de onboarding (criar academia como Owner **ou** aguardar convite).

### 4.3 Stack

- Frontend: Next.js, TypeScript, TailwindCSS, shadcn/ui, React Hook Form, Zod, Recharts
- Backend: Supabase (Auth, PostgreSQL, Storage, Realtime)
- App: PWA (manifest + service worker)

## 5. Data model

### 5.1 Core

**profiles** — id, name, email, avatar_url, phone, birth_date, gender, created_at, updated_at  

**academies** — id, name, logo_url, phone, email, instagram, city, state, address, description, is_active, created_at, updated_at  

**academy_units** — id, academy_id, name, address, city, state, phone, is_active, created_at, updated_at  

**academy_members** — id, academy_id, profile_id, role, status, current_belt, current_degree, joined_at, emergency_contact_name, emergency_contact_phone, medical_notes, created_at, updated_at  

**Roles (enum):** `owner` | `administrator` | `instructor` | `assistant_instructor` | `student` | `guardian`  

**Status:** `active` | `inactive` | `suspended`

### 5.2 Classes & sessions

**classes** — id, academy_id, unit_id, name, description, minimum_age, maximum_age, minimum_belt, maximum_belt, is_active  

**class_schedules** — id, class_id, weekday, start_time, end_time  

**class_sessions** — id, class_id, instructor_id, date, started_at, finished_at, status (`scheduled` | `open` | `finished` | `cancelled`)

### 5.3 Attendance (sem QR no MVP)

**attendance_requests** — id, session_id, student_id, requested_at, status (`pending` | `approved` | `rejected`)  

**attendance_records** — id, session_id, student_id, checked_at, attendance_type (`self_checkin` | `manual`)  

Regras:

- Check-in só com sessão `open`.
- No máximo 1 request ativa (`pending`) por aluno por sessão.
- Aprovação cria `attendance_records` e marca request como `approved`.
- Sessão `finished` bloqueia novos check-ins.

### 5.4 Graduations

**belt_levels** — id, name, order (seed: Branca → Vermelha)  

**graduation_history** — id, member_id, belt, degree, graduated_at, awarded_by, notes, certificate_url  

Regra: **append-only**. Nunca atualizar registros antigos; ao graduar, inserir histórico e atualizar `current_belt` / `current_degree` em `academy_members`.

### 5.5 Communication

**announcements** — id, academy_id, title, description, created_by, created_at  

**notifications** — id, profile_id, title, description, is_read, created_at  

### 5.6 QR (adiado)

Não implementar UI/fluxo. Se útil para migração futura, tabela `session_qr_tokens` pode existir vazia/não usada — preferência: **não criar** até a feature ser priorizada.

## 6. Permissions

| Capability | Owner | Admin | Instructor | Asst. Instructor | Student | Guardian |
|------------|:-----:|:-----:|:----------:|:----------------:|:-------:|:--------:|
| Academia / unidades / roles | ✓ | — | — | — | — | — |
| Dashboard | ✓ | ✓ | ✓* | — | — | — |
| Cadastrar/consultar alunos | ✓ | ✓ | ✓ | consultar | — | vinculado |
| Turmas / horários | ✓ | ✓ | ✓ | — | ver | — |
| Abrir/encerrar aula | ✓ | ✓ | ✓ | abrir | — | — |
| Aprovar presença | ✓ | ✓ | ✓ | — | — | — |
| Presença manual | ✓ | ✓ | ✓ | ✓ | — | — |
| Check-in (aula aberta) | — | — | — | — | ✓ | — |
| Graduar | ✓ | ✓ | ✓ | — | ver próprio | ver vinculado |
| Avisos | ✓ | ✓ | ✓ | — | ver | ver |

\*Instructor: dashboard operacional (presenças do dia, turmas), não necessariamente KPIs de gestão completa.

Enforcement: UI por capability + Server Actions + RLS.

## 7. UI / UX

### 7.1 Visual language

- Background: midnight gradient (`#070b16` → `#121a2e`)
- Primary accent: electric green `#22c55e` (FAB, CTAs)
- Quick actions: blue / purple / pink gradients
- Cards: glassmorphism (blur + border suave + radius ~20px)
- Typography: Geist ou Plus Jakarta Sans (evitar Inter/Roboto/Arial)
- UI language: pt-BR

### 7.2 Navigation (mobile-first)

Bottom nav:

1. **Home** — dashboard / métricas / atalhos  
2. **Turmas** — classes + horários + sessões  
3. **FAB** — atalho “Aulas abertas / Check-in” (não scanner)  
4. **Stats** — gráficos (Recharts)  
5. **Menu** — membros, graduações, avisos, notificações, academia, perfil, configurações  

Desktop: mesmo app responsivo (layout estreito centrado ou nav adaptada); prioridade é mobile.

### 7.3 Key screens

- Auth (login / signup)
- Onboarding academia / seletor de academia
- Home dashboard (totais, presenças do dia/mês, recentes)
- Membros (CRUD conforme role)
- Turmas + horários
- Aula aberta (instructor): lista pending + aprovar/rejeitar + encerrar
- Check-in aluno: lista de aulas `open` → toque “Registrar presença”
- Graduações + histórico
- Avisos + notificações
- Perfil / configurações

## 8. Critical flows

### 8.1 Open class → self check-in → approve

1. Instructor+ seleciona turma → **Abrir aula** → `class_sessions.status = open`
2. Students veem a sessão em Home / Aulas de hoje / FAB
3. Student toca **Registrar presença** → `attendance_requests` (`pending`)
4. Instructor vê lista Realtime → approve/reject
5. On approve → `attendance_records` (`self_checkin`) + notification
6. Instructor **Encerrar aula** → `finished` (bloqueia novos check-ins)

### 8.2 Manual attendance

Instructor/Admin/Owner/Asst. adiciona aluno direto como `attendance_records` com type `manual` (e request opcional já approved).

### 8.3 Graduation

Instructor+ cria novo `graduation_history`; atualiza `current_belt` / `current_degree` no member; notifica aluno.

## 9. Error handling & edge cases

- Zod em forms e boundaries de Server Actions
- Sem academia ativa → forçar seletor/onboarding
- Check-in sem sessão open → erro claro
- Duplicate pending request → rejeitar com mensagem
- Cross-tenant access → bloqueado por RLS + guard de action
- Toasts + empty states premium

## 10. Verification (MVP done when)

- [ ] Auth + profile + criar/selecionar academia (Owner)
- [ ] CRUD unidades e membros com roles (sem receptionist)
- [ ] Turmas + horários
- [ ] Abrir aula → check-in por toque → aprovar → registro
- [ ] Presença manual
- [ ] Graduação append-only + dashboard charts
- [ ] Avisos + notificações
- [ ] Permissões por role (UI + server)
- [ ] PWA instalável
- [ ] RLS testado (usuário A não vê academia B)

## 11. Implementation approach

Entregar o MVP completo em um ciclo contínuo (pedido do produto), mantendo a ordem lógica do PRD internamente:

1. Setup Next.js + shadcn + PWA + Supabase client + schema/RLS  
2. Auth + multi-tenant context  
3. Academias / unidades / members  
4. Turmas / horários  
5. Sessões + presença (self-checkin)  
6. Graduações  
7. Dashboard  
8. Avisos / notificações  
9. Hardening de permissões + polish UI premium  

## 12. Open follow-ups (post-MVP)

- QR Code temporário (módulo 07 do PRD)
- Guardian linking UX detalhado
- Convites por email para members
