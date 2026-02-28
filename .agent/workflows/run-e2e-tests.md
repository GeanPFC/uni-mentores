---
description: Run E2E tests with Playwright to verify all features work before production
---

## Pre-requisitos

1. Asegúrate de tener un archivo `.env.test` en la raíz del proyecto con:
```
TEST_USER_EMAIL=tucorreo@uni.pe
TEST_USER_PASSWORD=tucontraseña
```

## Correr todos los tests

// turbo
2. Ejecutar los tests:
```bash
npx playwright test
```

## Correr un test específico

3. Por ejemplo, solo tests de social:
```bash
npx playwright test e2e/05-social.spec.ts
```

## Ver el reporte HTML

// turbo
4. Si los tests terminaron, puedes abrir el reporte:
```bash
npx playwright show-report
```

## Tests disponibles

| Archivo | Qué verifica |
|---------|-------------|
| `01-navigation` | Todas las páginas cargan, nav links correctos, no Grupos |
| `02-auth` | Login, registro, validación de email UNI |
| `03-explore` | Posts, filtros, búsqueda, share, like, comentarios |
| `04-create-post` | Wizard de 5 pasos para crear publicación |
| `05-social` | Like, comentar, seguir, compartir |
| `06-profile` | Perfil propio, perfil público, perfil 404 |
| `07-chat` | Chat carga, enviar mensaje |
| `08-home-feed` | Feed, ActivityFeed sidebar, CTAs |

## Notas
- Los tests se ejecutan en Chromium (Chrome)
- Si falla un test, se guarda screenshot en `test-results/`
- El dev server se levanta automáticamente
