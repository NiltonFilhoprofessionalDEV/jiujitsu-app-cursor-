# Alerta de aniversário para staff — Design Spec

**Date:** 2026-07-20  
**Status:** Approved for implementation planning  
**Product:** BJJ Pulse  
**Related:** home ops board, inbox (`notifications` + `notify_profile`), cron pattern (`/api/cron/*`)

## 1. Goal

Avisar **owner, administrator e instructor** quando membros da academia fazem aniversário:

1. **Home** — card com aniversariantes de **hoje + próximos 7 dias**
2. **Inbox (sino)** — notificação **somente no dia** do aniversário

## 2. Decisions (brainstorming)

| Topic | Decision |
|-------|----------|
| Surface | Home **e** notificações |
| Janela no Home | Hoje + 7 dias |
| Notificação | Só no dia do aniversário |
| Audiência | Roles com painel: `owner`, `administrator`, `instructor` |
| Approach | Widget no dashboard + cron diário (`/api/cron/birthday-alerts`) |
| Fonte de dados | `profiles.birth_date` (já existente) |
| Timezone | Unidade → academia → fallback `America/Sao_Paulo` (mesmo helper das sessões) |
| Dedupe | Tabela `birthday_notifications_sent` (1 notificação por staff × aniversariante × dia) |

## 3. Out of scope (v1)

- Staff editar `birth_date` na ficha do membro (continua só em `/profile`)
- Push nativo / e-mail além da inbox in-app
- Notificar o próprio aniversariante
- Antecipação por notificação (amanhã / 7 dias) — só lista no Home
- Incluir `assistant_instructor` na audiência
- Aniversariantes sem app (`pending_*` sem `profile_id` / sem `birth_date`)

## 4. Architecture

```
profiles.birth_date  ←── já coletado em /profile

Home (owner/admin/instructor)
  → getHomeOpsBoard / getDashboardData
  → listBirthdaysInRange(members, todayLocal, 7)
  → BirthdayCard (hoje destacado + próximos)

Cron diário → GET|POST /api/cron/birthday-alerts (CRON_SECRET)
  → createAdminClient
  → por academia: resolve “hoje” no timezone
  → aniversariantes ativos com birth_date
  → staff ativos (owner/admin/instructor)
  → notify_profile (agregado se vários) + insert dedupe
```

## 5. Data model

### birthday_notifications_sent (nova)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | default `gen_random_uuid()` |
| academy_id | uuid FK → academies | cascade |
| birthday_profile_id | uuid FK → profiles | quem faz aniversário |
| staff_profile_id | uuid FK → profiles | quem recebe a notificação |
| for_date | date | data local “hoje” usada no cron |
| created_at | timestamptz | default now() |

**Unique:** `(academy_id, birthday_profile_id, staff_profile_id, for_date)`

RLS: sem acesso client; escrita só via service role no cron. (Opcional: policy deny-all para authenticated.)

### Sem alteração em profiles

`birth_date date` já existe. Nenhuma migration de coluna em `profiles`.

## 6. Domain logic

### Helper puro — `lib/birthdays/range.ts` (nome final livre)

Entrada: lista `{ memberId, profileId, name, birthDate }`, `today` (YYYY-MM-DD local), `daysAhead = 7`.

Saída ordenada:

```ts
type BirthdayEntry = {
  member_id: string;
  profile_id: string;
  name: string;
  birth_date: string; // original
  occurs_on: string;  // YYYY-MM-DD neste ciclo (ano atual ou +1 se já passou)
  age: number | null; // anos completos no occurs_on; null se inválido
  is_today: boolean;
};
```

Regras:

- Comparar só mês/dia; ignorar ano do nascimento para “quando ocorre”
- Virada de ano: se hoje = 28/dez e aniversário = 02/jan → entra na janela
- 29/fev: em ano não-bissexto, tratar ocorrência como 28/fev (documentado e testado)
- Membros sem `birth_date` ou `status !== 'active'` → excluídos na query, não no helper

### Home payload

Estender `HomeOpsBoard` / `DashboardData` com:

```ts
birthdays: BirthdayEntry[]; // já filtrados à janela
```

UI: card “Aniversariantes”

- Seção **Hoje** (se `is_today`)
- Seção **Próximos** (resto, com label de data curta pt-BR)
- Clique → `/members/[id]` quando `can(role, "view_members")`
- Lista vazia: **esconder** o card (mobile e desktop)

### Notificação

- **Quando:** cron diário; apenas entradas com `is_today` no timezone da academia
- **Quem recebe:** membros ativos com role ∈ `{owner, administrator, instructor}` da mesma academia
- **Auto-exclusão:** o aniversariante **não** recebe notificação sobre o próprio aniversário; se for staff, ainda recebe sobre os **outros** do dia
- **Texto (1 aniversariante):** título `Aniversário hoje`; descrição `{nome} faz aniversário hoje`
- **Texto (N>1):** título `Aniversários hoje`; descrição `{nome1}, {nome2} e mais {N-2}…` (se N=2: `{a} e {b}`)
- **Kind:** `birthday` em `inferNotificationKind` / `notificationKindMeta` (ícone Cake ou Gift)
- **Dedupe:** antes de notificar um staff, filtrar aniversariantes já presentes em `birthday_notifications_sent` para `(academy_id, staff_profile_id, for_date)`. Montar mensagem só com os restantes; inserir dedupe + `notify_profile` na mesma passagem. Se a lista restante ficar vazia, skip.

## 7. Cron

| Item | Valor |
|------|--------|
| Route | `app/api/cron/birthday-alerts/route.ts` |
| Auth | header/`CRON_SECRET` (mesmo padrão de `auto-sessions`) |
| Schedule | `0 11 * * *` UTC ≈ 08:00 BRT (ajustar se necessário) |
| vercel.json | adicionar entrada em `crons` |
| Client | `createAdminClient` (service role) |

Idempotência: unique constraint + skip se já enviado.

## 8. Permissions

| Ação | Quem |
|------|------|
| Ver card no Home | `view_dashboard` (owner/admin/instructor) |
| Receber notificação | Mesmos roles, ativos na academia |
| Ler `birth_date` de colegas | Já coberto por `profiles_select_same_academy`; cron usa service role |

Aluno puro: sem card, sem notificação de staff.

## 9. Testing

- Unit: range 7 dias, virada de ano, 29/02, ordenação (`is_today` primeiro)
- Unit: formatação de descrição agregada (1, 2, 3+)
- Manual: perfil com `birth_date` = hoje → card + (após cron/local invoke) inbox
- Manual: sem `birth_date` → não aparece

## 10. Implementation notes

- Reutilizar `resolveTimezone` de sessões/push
- Não expandir `MEMBER_SELECT` global só por isso se pesar; preferir query dedicada no dashboard/cron
- Manter arquivos focados: helper puro + action/cron + widget fino
