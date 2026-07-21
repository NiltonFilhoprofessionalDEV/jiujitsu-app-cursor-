1. Abra o SQL Editor no Supabase Dashboard do projeto.
2. Cole e execute o conteúdo de `0001_init.sql` (fresh install).
3. Se o banco já aplicou um `0001` antigo, execute também `0002_security_fixes.sql`.
4. Execute `0003_academy_invites.sql` (convites por link / WhatsApp).
5. Execute `0004_virtual_classroom.sql` (sala virtual YouTube), se ainda não aplicou.
6. Execute `0005_avatars_storage.sql` (avatars), se ainda não aplicou.
7. Execute `0006_auto_open_sessions.sql` (abertura/fechamento automático de aulas).
8. Execute `0009_virtual_lesson_social.sql` (favoritos/comentários), `0018_virtual_lesson_likes_replies.sql` (curtidas + respostas) e `0020_virtual_lesson_watches.sql` (vídeos assistidos).
9. Execute `0008_owner_invites.sql` (gate de criação de academia) e `0021_platform_admin_owner_email.sql` (convite de dono por e-mail + suspensão).
10. Execute `0021_birthday_notifications_sent.sql` (dedupe de alertas de aniversário para staff).
11. Execute `0022_belt_degree_requirements.sql` (metas de aulas por faixa/grau + alertas de elegibilidade) — use `IF NOT EXISTS` (já pode estar aplicado).
12. Execute `0023_kids_belt_levels.sql` (faixas infantis IBJJF: cinza/amarela/laranja/verde com combinações).
13. Em Database → Replication, habilite Realtime na tabela `attendance_requests`.
14. Em produção, defina `CRON_SECRET` e um disparador frequente para auto-open:
    - **Netlify:** scheduled functions `auto-sessions` (`*/2`) e `class-reminders` (`*/10`) em `netlify.toml` (precisa `SITE_URL`/`URL` + `CRON_SECRET`).
    - **GitHub Actions:** workflows `cron-auto-sessions.yml` e `cron-class-reminders.yml` com secrets `APP_BASE_URL` + `CRON_SECRET`.
    - **Vercel Hobby:** o cron nativo em `vercel.json` roda só 1x/dia — use Netlify ou Actions para abertura de aulas.
15. Defina `PLATFORM_ADMIN_EMAILS` com os e-mails que podem acessar `/admin`.

## Notas de segurança (0002)

- **Academies:** não há policy de INSERT direto; use apenas a RPC `create_academy_with_owner`.
- **Notificações:** inserts para outros usuários passam por `notify_profile` (SECURITY DEFINER). A policy `notif_own` continua bloqueando insert direto em nome de terceiros.
- **Dados médicos / emergência:** tabela `member_private_details` (staff ou self). Colunas sensíveis saíram de `academy_members`.
- **Check-in:** aprovação atômica via `approve_attendance_request` (request + attendance_record na mesma transaction).

## Convites (0003)

- Tabela `academy_invites` + RPCs `get_invite_preview` (anon/authenticated) e `accept_academy_invite` (authenticated).
- Owner/Admin/Instructor gera link em **Membros** e compartilha no WhatsApp.
- Aluno abre `/invite/[token]` → signup/login → entra na academia.

Onboarding: a app deve chamar `create_academy_with_owner` (RPC), não inserts diretos em `academies` / `academy_members`.
