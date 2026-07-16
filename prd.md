# PRD Master - BJJ Management

## Visão do Produto

O sistema será um SaaS multi-academia para gerenciamento completo de academias de Jiu-Jitsu, desenvolvido inicialmente como PWA (Progressive Web App).

O objetivo do MVP é permitir que proprietários e professores realizem o gerenciamento de alunos, turmas, graduações, presenças e comunicação interna da academia através de uma plataforma moderna, simples e escalável.

O sistema deverá ser multi-tenant, permitindo que várias academias utilizem a mesma aplicação sem compartilhamento de dados.

## Stack do Projeto

### Frontend
- NextJS
- TypeScript
- TailwindCSS
- Shadcn UI
- React Hook Form
- Zod
- Recharts

### Backend
- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Storage
- Supabase Realtime

### Aplicação
- PWA

## Requisitos do MVP

O MVP deverá possuir os seguintes módulos:

- Cadastro da Academia
- Cadastro de Usuários
- Cadastro de Membros
- Turmas e Horários
- Aulas
- Controle de Presença
- QR Code
- Graduações
- Dashboard
- Avisos
- Notificações
- Sistema de Permissões

## Módulos do Sistema

### Módulo 01 - Academia

#### Funcionalidades
- Cadastrar academia
  - Nome
  - Logo
  - Telefone
  - Email
  - Instagram
  - Cidade
  - Estado
  - Endereço
  - Descrição
- Cadastrar unidades
- Ativar ou desativar academia

#### Regras
- Uma academia pode possuir várias unidades.
- Todos os dados devem ser separados por academia.
- Nenhum usuário poderá visualizar dados de outra academia.

### Módulo 02 - Usuários

Todos os usuários do sistema utilizarão apenas uma tabela chamada `profiles`.

#### Campos
- id
- name
- email
- avatar_url
- phone
- birth_date
- gender
- created_at
- updated_at

### Módulo 03 - Membros da Academia

Tabela: `academy_members`

#### Campos
- id
- academy_id
- profile_id
- role
- status
- current_belt
- current_degree
- joined_at
- emergency_contact_name
- emergency_contact_phone
- medical_notes
- created_at
- updated_at

#### Roles disponíveis
- Owner
- Administrator
- Instructor
- Assistant Instructor
- Student
- Guardian
- Receptionist

#### Status
- Active
- Inactive
- Suspended

#### Regras
- Um usuário poderá participar de várias academias.

Exemplo:

- Nilton
  - Academia 1: Instructor
  - Academia 2: Student

### Módulo 04 - Turmas

Tabela: `classes`

#### Campos
- id
- academy_id
- unit_id
- name
- description
- minimum_age
- maximum_age
- minimum_belt
- maximum_belt
- is_active

#### Exemplos
- Infantil
- Adulto
- Competição
- NoGi
- Iniciantes
- Feminino

### Módulo 05 - Horários

Tabela: `class_schedules`

#### Campos
- id
- class_id
- weekday
- start_time
- end_time

### Módulo 06 - Aulas

Tabela: `class_sessions`

#### Campos
- id
- class_id
- instructor_id
- date
- started_at
- finished_at
- status

#### Fluxo
1. Professor abre aula
2. Sistema cria a sessão
3. QR Code temporário
4. Alunos realizam check-in
5. Professor aprova
6. Finaliza aula

### Módulo 07 - Presença

Tabela: `attendance_requests`

#### Campos
- id
- session_id
- student_id
- requested_at
- status

#### Status
- Pending
- Approved
- Rejected

Tabela: `attendance_records`

#### Campos
- id
- session_id
- student_id
- checked_at
- attendance_type

#### Attendance Type
- QR Code
- Manual

#### Fluxo da Presença
1. Aluno escaneia QR Code
2. Solicita presença
3. Professor recebe solicitação
4. Aprova ou rejeita
5. Presença registrada

### QR Code

O QR Code não poderá ser fixo.

#### Regras
- Gerado automaticamente
- Válido apenas para aquela aula
- Expira após alguns minutos
- Possui token único
- Não poderá ser reutilizado
- Deve estar vinculado a:
  - Academia
  - Turma
  - Professor
  - Horário
  - Sessão

### Módulo 08 - Graduações

Tabela: `belt_levels`

#### Campos
- id
- name
- order

#### Exemplos
- Branca
- Cinza
- Amarela
- Laranja
- Verde
- Azul
- Roxa
- Marrom
- Preta
- Coral
- Vermelha

Tabela: `graduation_history`

#### Campos
- id
- member_id
- belt
- degree
- graduated_at
- awarded_by
- notes
- certificate_url

#### Regras
- Nunca atualizar registros antigos.
- Toda graduação deverá gerar um novo histórico.

Exemplo:

- Faixa Branca
  - 0 grau em 20/01/2026
  - 1 grau em 15/04/2026
  - 2 grau em 18/08/2026

### Módulo 09 - Dashboard

O Dashboard deverá apresentar:

- Total de alunos
- Total de professores
- Total de turmas
- Presenças do dia
- Presenças do mês
- Novos alunos
- Graduações do mês
- Últimas graduações
- Últimas presenças
- Alunos inativos

#### Gráficos
- Alunos por faixa
- Presenças do mês
- Evolução de alunos
- Graduações do ano

### Módulo 10 - Avisos

Tabela: `announcements`

#### Campos
- id
- academy_id
- title
- description
- created_by
- created_at

#### Exemplos
- Sem aula amanhã
- Graduação sábado
- Novo horário
- Seminário
- Evento interno

### Módulo 11 - Notificações

Tabela: `notifications`

#### Campos
- id
- profile_id
- title
- description
- is_read
- created_at

#### Exemplos
- Sua presença foi registrada.
- Você recebeu um grau.
- Nova graduação disponível.
- Novo aviso.
- Sua aula começa em 30 minutos.

### Módulo 12 - Sistema de Permissões

#### Owner
- Pode fazer tudo.

#### Administrator
- Gerenciar alunos
- Gerenciar professores
- Gerenciar turmas
- Gerenciar avisos
- Gerenciar graduações
- Visualizar dashboards

#### Instructor
- Abrir aulas
- Encerrar aulas
- Aprovar presenças
- Cadastrar graduações
- Cadastrar presença manual
- Consultar alunos

#### Assistant Instructor
- Abrir aulas
- Consultar alunos
- Cadastrar presença manual

#### Student
- Consultar perfil
- Consultar histórico de presença
- Consultar graduações
- Consultar avisos
- Escanear QR Code

#### Guardian
- Consultar informações do aluno responsável

#### Receptionist
- Cadastrar alunos
- Consultar cadastros

## Layout do Sistema

- Dashboard
- Academia
- Membros
- Turmas
- Horários
- Aulas
- Presenças
- Graduações
- Avisos
- Notificações
- Perfil do Usuário
- Configurações

## Desenvolvimento por Etapas

### Etapa 01
- Setup do projeto
- Configuração do Supabase
- Autenticação
- Sistema multi-tenant

### Etapa 02
- Academias
- Unidades
- Profiles
- Academy Members

### Etapa 03
- Turmas
- Horários

### Etapa 04
- Sessões das aulas

### Etapa 05
- QR Code
- Presenças

### Etapa 06
- Graduações

### Etapa 07
- Dashboard

### Etapa 08
- Avisos
- Notificações

### Etapa 09
- Sistema completo de permissões

## Instruções para o Codex

- Desenvolver o projeto exclusivamente seguindo este PRD.
- Implementar apenas uma etapa por vez.
- Não iniciar funcionalidades futuras que não estejam previstas na etapa atual.
- Criar código desacoplado e escalável.
- Utilizar boas práticas de TypeScript, Supabase e NextJS.
- Toda nova funcionalidade deverá respeitar o sistema multi-tenant.
- Implementar Row Level Security no Supabase desde a primeira etapa.
- Priorizar componentes reutilizáveis e tipagem forte.
- Não criar código relacionado a pagamentos, campeonatos ou eventos nesta versão do MVP.
- Antes de iniciar uma nova etapa, validar a etapa anterior como concluída e funcional.
