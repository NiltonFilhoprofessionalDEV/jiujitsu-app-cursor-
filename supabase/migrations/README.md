1. Abra o SQL Editor no Supabase Dashboard do projeto.
2. Cole e execute o conteúdo de `0001_init.sql` (fresh install).
3. Se o banco já aplicou um `0001` antigo, execute também `0002_security_fixes.sql`.
4. Execute `0003_academy_invites.sql` (convites por link / WhatsApp).
5. Em Database → Replication, habilite Realtime na tabela `attendance_requests`.

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
