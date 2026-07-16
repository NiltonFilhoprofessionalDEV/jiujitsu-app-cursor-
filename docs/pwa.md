# PWA follow-up

O MVP inclui:

- `app/manifest.ts` — nome **BJJ Manager**, `display: standalone`, `theme_color: #070b16`
- Ícones em `public/icons/`
- `@ducanh2912/next-pwa` em `next.config.ts` (desabilitado em `development`)

Em produção (`next build` + `next start`), o service worker é gerado em `public/sw.js`.

## Follow-up opcional

- Migrar para Serwist se o Turbopack exigir plugin nativo sem webpack
- Cache strategies específicas para rotas autenticadas (evitar cache de dados sensíveis)
- Testar “Add to Home Screen” em Android Chrome e iOS Safari após o primeiro deploy
