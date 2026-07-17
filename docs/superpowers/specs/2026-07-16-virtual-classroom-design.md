# Sala Virtual (YouTube) — Design Spec

**Date:** 2026-07-16  
**Status:** Approved for implementation planning  
**Product:** BJJ Manager  
**Related:** `docs/superpowers/specs/2026-07-16-bjj-manager-design.md`

## 1. Goal

Permitir que a academia publique aulas em vídeo (links do YouTube) e que alunos assistam **dentro do app**, sem abrir o navegador externo — módulo **Sala virtual**.

## 2. Decisions (brainstorming)

| Topic | Decision |
|-------|----------|
| Approach | Módulo dedicado + embed YouTube (iframe oficial) |
| Who publishes | Owner, Administrator, Instructor |
| Organization | Híbrido: biblioteca geral **e** vínculo opcional a turma |
| Visibility | Escolhida na publicação: `academy` (toda academia) ou `class` (só turma) |
| Student v1 | Só assistir (lista + player) — sem progresso/comentários |
| Orientation | Horizontal (16:9) ou Vertical (9:16 / Shorts) |
| Upload próprio | Fora de escopo (YouTube only) |

## 3. Out of scope (v1)

- Progresso / “já assistido”
- Comentários
- Upload de arquivo / Vimeo / Storage
- Download offline
- Playlists avançadas
- Guardian linking fino além do acesso multi-tenant padrão

## 4. Architecture

```
Staff → Server Action createVirtualLesson
     → virtual_lessons (Postgres + RLS)
Student → /classroom list → /classroom/[id] → YouTube iframe embed
```

- Extrair `youtube_video_id` do URL (watch, youtu.be, shorts).
- Embed: `https://www.youtube.com/embed/{id}`
- Multi-tenant: sempre `academy_id` + RLS.

## 5. Data model

**virtual_lessons**

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| academy_id | uuid FK | required |
| title | text | required |
| description | text | optional |
| youtube_url | text | original paste |
| youtube_video_id | text | parsed |
| orientation | enum | `horizontal` \| `vertical` |
| class_id | uuid FK nullable | optional link to `classes` |
| visibility | enum | `academy` \| `class` |
| is_published | boolean | default true |
| created_by | uuid FK profiles | |
| created_at / updated_at | timestamptz | |

**Rules**

- If `visibility = class`, `class_id` is **required**.
- If `visibility = academy`, `class_id` may be null (geral) or set (categoria/filtro, ainda visível para toda academia).
- Cannot set `visibility = class` without a class in the same academy.

## 6. Permissions

| Capability | Owner | Admin | Instructor | Asst. | Student | Guardian |
|------------|:-----:|:-----:|:----------:|:-----:|:-------:|:--------:|
| manage_virtual_lessons (CRUD) | ✓ | ✓ | ✓ | — | — | — |
| view_virtual_lessons (assistir) | ✓ | ✓ | ✓ | ✓ | ✓* | ✓* |

\*Subject to visibility + membership RLS.

**Suggested capability names:** `manage_virtual_lessons`, `view_virtual_lessons` (add to `types/domain.ts` matrix).

## 7. RLS (summary)

- **Staff** (owner / administrator / instructor / assistant_instructor): SELECT all published lessons in the academy; manage CRUD for owner/admin/instructor only.
- **Students / guardians:** SELECT where `is_published` and (
  - `visibility = 'academy'`, OR
  - `visibility = 'class'` AND the viewer’s `academy_members.id` is in `class_members` for that `class_id`
)

### class_members (minimal, same feature)

| Column | Type |
|--------|------|
| id | uuid PK |
| class_id | uuid FK classes |
| member_id | uuid FK academy_members |
| unique(class_id, member_id) |

Managed by roles with `manage_classes` or `manage_members` (simple add/remove on class detail or classroom publish flow can link later). Without enrollment, students only see academy-wide lessons.

## 8. UI

### Navigation

- Menu item: **Sala virtual** → `/classroom`
- Staff: `/classroom/new` (and edit on detail)

### List

- Cards with play affordance
- Filters: Todas | por turma
- Badge: Horizontal / Vertical
- Empty state: “Nenhuma aula publicada” + CTA for staff

### Player detail

- Horizontal: full-width 16:9 iframe  
- Vertical: centered 9:16 max-height frame (mobile-first)  
- Title, description, class label, author

### Publish form

- Title, description  
- YouTube URL  
- Orientation: horizontal | vertical  
- Optional class  
- Visibility: toda academia | só esta turma  

Visual language: existing BJJ fight-poster theme (matte black + action red).

## 9. Error handling

- Invalid YouTube URL → validation error (Zod)  
- Embed blocked / private video → player error message: “Este vídeo não permite reprodução no app. Verifique se está público ou unlisted com embed liberado.”  
- `visibility = class` without class_id → reject  
- Cross-tenant blocked by RLS  

## 10. Verification

- [ ] Staff creates horizontal lesson (academy visibility) — student sees and plays in-app  
- [ ] Staff creates vertical/Shorts lesson — player uses 9:16 layout  
- [ ] Class-only lesson hidden from student not in `class_members`  
- [ ] Student cannot publish  
- [ ] Assistant cannot publish  
- [ ] Invalid link rejected  

## 11. Implementation notes

- Stack: Next.js Server Actions + Supabase + existing permissions matrix  
- Parse helpers: `extractYoutubeId(url)` supporting watch, youtu.be, shorts  
- CSP: allow `https://www.youtube.com` iframe embeds if CSP is configured later  
