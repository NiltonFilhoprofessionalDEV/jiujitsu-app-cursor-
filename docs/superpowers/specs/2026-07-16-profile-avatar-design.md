# Foto de Perfil (Avatar) — Design Spec

**Date:** 2026-07-16  
**Status:** Approved for implementation planning  
**Product:** BJJ Manager  
**Related:** `docs/superpowers/specs/2026-07-16-bjj-manager-design.md`

## 1. Goal

Permitir que o usuário envie uma foto de perfil na tela **Perfil** e que essa foto (ou a inicial do nome, se não houver foto) apareça no **canto superior direito** de todas as telas do app.

## 2. Decisions (brainstorming)

| Topic | Decision |
|-------|----------|
| Approach | Supabase Storage bucket `avatars` + coluna existente `profiles.avatar_url` |
| Header placement | Global: avatar no canto superior direito em todas as telas |
| Home | `[avatar] [sino de notificações]` |
| Upload UX | Tocar no avatar grande do perfil (overlay de câmera) → escolher arquivo |
| Fonte da verdade | `public.profiles.avatar_url` (não `user_metadata` do Auth) |
| Free plan | Suportado (1 GB Storage, até 50 MB/arquivo; sem Image Transformations) |

## 3. Out of scope (v1)

- Remover foto (só trocar / sobrescrever)
- Crop / edição / compressão avançada no cliente
- Avatar na lista de membros
- Image Transformations do Supabase
- Espelhar avatar em `auth.users.raw_user_meta_data`

## 4. Architecture

```
User → ProfileAvatarUpload (tap avatar)
     → Server Action uploadAvatar
     → Storage bucket avatars/{userId}/avatar.{ext}
     → UPDATE profiles.avatar_url
     → revalidatePath (app pages)
HeaderUserAvatar ← profiles.avatar_url (ou inicial)
```

### 4.1 Storage

- Bucket: `avatars`
- Public read (URLs diretas no componente Avatar)
- Write/update/delete: authenticated; path restrito a `{auth.uid()}/*`
- Allowed MIME: `image/jpeg`, `image/png`, `image/webp`
- Max size (app + bucket): ~2 MB
- Path convention: `{userId}/avatar.{ext}` (upsert na troca)

### 4.2 Database

- Sem migration de coluna: `profiles.avatar_url` já existe
- RLS existente: `profiles_update_self` / `profiles_select_self` (e select same academy)
- Nova migration: criar bucket + policies de Storage apenas

### 4.3 App components

| Piece | Responsibility |
|-------|----------------|
| `ProfileAvatarUpload` | Avatar grande + overlay câmera + input file + loading/erro |
| `HeaderUserAvatar` | Avatar pequeno → link `/profile`; fallback inicial |
| `PageHeader` / páginas `(app)` | Slot direito: avatar (Home: avatar + bell) |
| `actions/profile.ts` | Validar arquivo, upload Storage, update `avatar_url`, revalidate |

## 5. User flow

1. Usuário abre `/profile`.
2. Toca no avatar grande (ícone de câmera).
3. Escolhe imagem (JPEG/PNG/WebP).
4. App valida tipo e tamanho (máx. 2 MB).
5. Upload com upsert no path do usuário.
6. Persiste URL pública em `profiles.avatar_url`.
7. UI atualiza no perfil e no header global.
8. Sem foto: fallback com inicial do `name` (comportamento atual do perfil).

## 6. Error handling

- Tipo inválido ou > 2 MB → mensagem clara no perfil; não sobe arquivo.
- Falha no Storage → não atualiza `avatar_url`.
- Usuário não autenticado / sem membership → fluxo existente de proteção de rotas.

## 7. Done criteria

- [ ] Upload via toque no avatar do perfil funciona
- [ ] `avatar_url` persiste e sobrevive a reload
- [ ] Avatar (ou inicial) visível no topo direito em todas as telas do app
- [ ] Home mantém sino ao lado do avatar
- [ ] Policies impedem upload na pasta de outro usuário

## 8. Supabase Free plan note

O plano Free **suporta** esta feature via Storage (1 GB total, max 50 MB/arquivo). Image Transformations não estão inclusas; para v1 a imagem é servida como enviada.
