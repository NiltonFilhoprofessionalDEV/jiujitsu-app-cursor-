1. Abra o SQL Editor no Supabase Dashboard do projeto.
2. Cole e execute o conteúdo de `0001_init.sql`.
3. Em Database → Replication, habilite Realtime na tabela `attendance_requests`.

Onboarding: a app deve chamar `create_academy_with_owner` (RPC), não inserts diretos em `academies` / `academy_members`.
