# Minha Jornada — Design Spec

**Date:** 2026-07-17  
**Status:** Approved for implementation planning  
**Product:** BJJ Manager  
**Related:** `docs/superpowers/specs/2026-07-16-bjj-manager-design.md`

## 1. Goal

Dar ao **aluno** uma aba **Minha Jornada** para acompanhar evolução com:

- Resumo de presença e faixa atual
- Troféus por marcos de aulas
- Timeline com entrada na academia, graduações e conquistas

## 2. Decisions (brainstorming)

| Topic | Decision |
|-------|----------|
| Goal v1 | Troféus + timeline enxutos (não só um dos dois) |
| Nav placement | Bottom nav: aluno vê **Jornada** no lugar de **Stats**; staff mantém Stats |
| Milestone source | Fixos no app na v1; academia configura na v2 |
| Milestone values | 5, 10, 25, 50, 100, 200 aulas |
| Timeline content | Graduações + troféus desbloqueados (+ entrada na academia) |
| Unlock feedback | Notificação + destaque animado na Jornada |
| Page layout | A — Resumo no topo + grade de troféus + timeline abaixo |
| Technical approach | Calcular na leitura + persistir conquistas; unlock no approve de presença + fallback ao abrir Jornada |

## 3. Out of scope (v1)

- Configuração de marcos pela academia
- Ranking / comparação entre alunos
- Cada aula individual na timeline
- Guardian vendo a jornada do filho
- Troféus por streak, tempo de academia ou outros eixos além de contagem de aulas
- Substituir Stats para staff

## 4. Architecture

```
Attendance approved
  → count attendance_records for member
  → compare fixed milestones
  → insert member_achievements (new only)
  → notify_profile ("Você conquistou…")

Student opens /journey
  → syncAchievements fallback
  → JourneySummary + TrophyGrid + JourneyTimeline
```

### 4.1 Data sources (existing)

| Source | Use |
|--------|-----|
| `attendance_records` | Contagem de aulas do aluno na academia ativa |
| `academy_members` | Faixa/grau atual, `joined_at` |
| `graduation_history` | Eventos de faixa na timeline |
| `notifications` | Feedback de conquista |

### 4.2 New table: `member_achievements`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `academy_id` | uuid FK | academia ativa do membro |
| `member_id` | uuid FK → `academy_members` | |
| `code` | text | ex. `classes_25` |
| `unlocked_at` | timestamptz | default now() |

Constraints:

- `unique (member_id, code)`
- RLS: membro lê as próprias conquistas; staff da mesma academia pode ler (opcional v1: só self-read basta para a página do aluno)

### 4.3 Milestone codes (v1 constants)

```
classes_5, classes_10, classes_25, classes_50, classes_100, classes_200
```

Mapped to thresholds: 5 / 10 / 25 / 50 / 100 / 200.

### 4.4 Permissions & nav

- Capability: `view_own_journey` for role `student`
- Bottom nav (role-aware):
  - `can(role, "view_dashboard")` → Stats (`/stats`)
  - else if `can(role, "view_own_journey")` → Jornada (`/journey`)
- Route protected like other `(app)` pages (auth + active membership)

## 5. UI structure (layout A)

**Route:** `/journey`  
**Label:** Jornada (ou “Minha Jornada” no título da página)

1. **JourneySummary**
   - Total de aulas confirmadas
   - Faixa/grau atual
   - Barra de progresso até o próximo troféu (ex.: “8 para o troféu 50”)
2. **TrophyGrid**
   - Seis slots (5…200)
   - Estados: bloqueado / conquistado / recém-desbloqueado (animação)
3. **JourneyTimeline**
   - Ordenação: mais recente no topo
   - Tipos de evento: `joined`, `graduation`, `achievement`
   - Sem listar cada aula

## 6. Unlock flow

1. Staff aprova presença → após insert em `attendance_records`, chamar `unlockAchievementsIfNeeded(memberId)`.
2. Função conta aulas, insere códigos ainda não existentes, dispara notificação por conquista nova.
3. Ao abrir `/journey`, mesmo sync como fallback (presenças manuais antigas / race).
4. UI destaca conquista com `unlocked_at` recente (ex.: últimas 24h ou query `?highlight=`).

## 7. Error / edge cases

- Aluno sem nenhuma presença: total 0, todos os troféus bloqueados, timeline só com entrada (se `joined_at` existir).
- Contagem só na academia ativa (não soma multi-academia).
- Reaprovação / unique de presença já evita double-count; unique de achievement evita double-unlock.
- Papéis sem `view_own_journey` e sem dashboard: não veem o slot Stats/Jornada (comportamento atual do nav para tabs filtradas — se o slot for obrigatório, fallback Menu; preferir manter 5 slots com Stats OU Jornada).

## 8. Done criteria

- [ ] Aluno vê **Jornada** no bottom nav no lugar de Stats
- [ ] Staff continua com Stats
- [ ] Resumo (aulas + faixa + progresso) correto
- [ ] Troféus desbloqueiam nos marcos 5/10/25/50/100/200
- [ ] Notificação ao desbloquear
- [ ] Destaque animado na Jornada para conquista recente
- [ ] Timeline com entrada + graduações + troféus
- [ ] Spec v2 anotada: marcos configuráveis pela academia

## 9. Spec notes for planning

- Prefer server components + small client islands for trophy animation.
- Reuse existing notification RPC/`notify_profile` pattern.
- Keep milestone list in one shared constant module (`lib/journey/milestones.ts`) to ease v2 config later.
