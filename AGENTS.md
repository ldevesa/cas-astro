# AGENTS.md — Harness del proyecto CAS (sitio + Sanity)

Reglas operativas para cualquier agente (Claude Code, Codex, Cursor, etc.) que trabaje en este repo.
Es el punto de entrada: leer esto primero, después [docs/SESSIONS.md](docs/SESSIONS.md) (última sesión) y [docs/PLAN.md](docs/PLAN.md) (qué sigue).

| Documento | Para qué |
| :--- | :--- |
| `AGENTS.md` (este) | Cómo trabajar acá: comandos, estructura, reglas, gotchas, definición de "terminado" |
| [docs/SPEC.md](docs/SPEC.md) | Qué hace el sistema: requisitos, modelo de contenido, rutas, integraciones |
| [docs/PLAN.md](docs/PLAN.md) | Qué falta y en qué orden: backlog priorizado + mejoras técnicas |
| [docs/SESSIONS.md](docs/SESSIONS.md) | Bitácora de sesiones: qué se hizo, qué quedó pendiente |
| [CLAUDE.md](CLAUDE.md) | Historia detallada de la migración y gotchas reales (contexto largo) |
| [CUTOVER.md](CUTOVER.md) | Checklist manual para pasar `contenidosad.com` a producción |
| [README.md](README.md) / [MANUAL.md](MANUAL.md) | Documentación para personas (setup, operación, troubleshooting) |

## 1. Qué es esto (en 5 líneas)

- Sitio corporativo de **CAS – Contenidos Advertising**, Astro 7 **estático** (SSG), en 3 idiomas (es default sin prefijo, `/pt`, `/en`).
- Contenido en **Sanity** (projectId `21wszpvy`, dataset `production`), campos localizados `{es, pt, en}` en un solo documento.
- Hosting en **Cloudflare Pages** (`cas-sitio.pages.dev`), rebuild disparado por webhook de Sanity al publicar.
- Formulario de contacto = Pages Function `functions/api/contact.js` (Mailjet principal, Resend fallback).
- Studio deployado aparte en https://cas-sitio.sanity.studio (código en `studio/`).

## 2. Comandos

Todos desde la raíz, salvo indicación.

| Tarea | Comando |
| :--- | :--- |
| Dev server | `npm run dev` → http://localhost:4321 |
| Build (243+ páginas, pide datos a Sanity) | `npm run build` |
| Preview del build | `npm run preview` |
| Chequeo de tipos | `npx astro check` |
| Studio local | `cd studio && npm run dev` → http://localhost:3333 |
| Deploy del Studio | `cd studio && npx sanity deploy -y` (el `appId` ya está en `sanity.cli.ts`) |
| Validar documentos en Sanity | `cd studio && npx sanity documents validate` |
| CORS de Sanity | `cd studio && npx sanity cors add <origin> --no-credentials` |
| Pipeline de migración WP→Sanity (histórico, idempotente) | `cd migration && npm run extract && npm run match && npm run transform && npm run import` |

`tsconfig.json` excluye `studio/` y `migration/` a propósito: son paquetes npm aparte, y si se incluyen `astro check` se queda sin memoria.

**Línea base conocida de `astro check`:** 8 errores, todos en `src/components/CoberturaGlobo.astro` (`window.am5` / `window.am5map` sin tipar). Cualquier error nuevo fuera de ese archivo es una regresión.

Variables locales: copiar `.env.example` → `.env` (`PUBLIC_SANITY_PROJECT_ID`, `PUBLIC_SANITY_DATASET`). Sin ellas el build falla con `Configuration must contain projectId`.

## 3. Mapa del repo

```
src/
  lib/cms.ts          ← ÚNICA puerta a Sanity: queries GROQ + mapeo a objetos planos por idioma
  lib/site-data.ts    ← datos estáticos (oficinas, redes) — no vienen del CMS
  i18n/ui.ts, utils.ts← strings de UI y helpers de rutas por idioma
  layouts/Layout.astro← <head>, nav, footer, GTM/scripts de seguimiento, captura de UTMs
  components/         ← HeroShader (Three.js ASCII), CoberturaGlobo (amCharts), ClientesCarousel
  pages/              ← páginas ES; pages/en/ y pages/pt/ son COPIAS por idioma (ver regla R3)
functions/api/contact.js ← formulario (Cloudflare Pages Function) — el que corre en producción
api/contact.js          ← mismo formulario en formato Vercel (respaldo a propósito, no borrar; duplicado a mano)
studio/                 ← Sanity Studio (paquete npm propio, schemas en studio/schemaTypes/)
migration/              ← scripts one-shot WP→Sanity (ya ejecutados; reports/ versionado)
public/_headers         ← headers de Cloudflare (seguridad + cache)
```

## 4. Reglas (obligatorias)

- **R1 — No tocar `../cas-astro`.** Es otro worktree (rama `main`). Este worktree trabaja en `sanity-migration`. Merge a `main` = decisión explícita del usuario.
- **R2 — Todo acceso a Sanity pasa por `src/lib/cms.ts`.** Las páginas reciben objetos planos ya resueltos por idioma (`caso.titulo`, `caso.imagenUrl`); no escribir GROQ en `.astro`. Fallback de idioma: `lang` → `es`.
- **R2b — Pocas queries por build.** En rutas dinámicas, traer todo en `getStaticPaths` y pasarlo por `props`; no volver a pedir a Sanity por slug en cada página. Datos globales que usa el Layout se cachean en build (ver `getConfiguracionSeguimiento`).
- **R2c — Imágenes de Sanity con `srcset` + `sizes`.** Toda `<img>` con foto de caso usa `srcset={caso.imagenSrcset}` (o `img.srcset` en galería) y un `sizes` acorde al ancho real en pantalla; `loading="lazy"` salvo la imagen principal (hero, `fetchpriority="high"`). Los logos de clientes son 200×200 y no lo necesitan.
- **R3 — Cambios de página = 3 archivos.** Toda página existe en `src/pages/`, `src/pages/en/` y `src/pages/pt/`. Un cambio de estructura/markup se replica en los 3 (hoy ya divergieron: p. ej. `index.astro` tiene 406/335/343 líneas). Textos de UI compartidos van en `src/i18n/ui.ts`.
- **R4 — Slugs siempre en español** en los 3 idiomas (`/en/casos/<slug-es>`).
- **R5 — Nuevo `_type` de documento en Sanity ⇒ actualizar el filtro del webhook** en sanity.io/manage (no se puede por código). Si no, publicar ese tipo "no hace nada". Filtro actual: `_type in ["caso","cliente","carrera","paginaHome","configuracionSeguimiento"]`.
- **R6 — Listas duplicadas que deben mantenerse sincronizadas:**
  - categorías de caso: `options.list` en `studio/schemaTypes/caso.ts` ⇄ `CATEGORIAS_CASO` en `src/lib/cms.ts`
  - formulario: `functions/api/contact.js` ⇄ `api/contact.js`
  - dependencias `sanity`/`react`/`styled-components` en raíz ⇄ `studio/package.json` (mismas versiones)
- **R7 — Nuevo origen que sirva video de Sanity con el shader ⇒ agregarlo a CORS** (`sanity cors add`). `curl` no detecta el problema; solo el navegador con `crossOrigin="anonymous"`.
- **R8 — Secretos:** nunca commitear `.env`, `migration/.env` ni tokens. Las variables de Cloudflare van en **Production y Preview** (scopes separados).
- **R9 — Scripts puntuales contra el dataset** (patches, backfills): usar el token de `migration/.env`, correrlos desde el scratchpad o borrarlos después, y anotarlos en `docs/SESSIONS.md`. El dataset `production` es el único: no hay staging.
- **R10 — Commits:** mensajes en español, imperativo, una línea descriptiva (ver `git log`). Commitear/pushear solo si el usuario lo pide.

## 5. Definición de "terminado"

Un cambio está terminado cuando:

1. `npm run build` pasa y la cantidad de páginas no bajó sin motivo.
2. `npx astro check` no suma errores sobre la línea base.
3. Se verificó en `npm run preview` en **los 3 idiomas** las páginas afectadas (incluido fallback a ES si falta traducción).
4. Si tocó schemas: `cd studio && npx sanity documents validate` sin errores nuevos, y Studio redeployado si corresponde.
5. Si agregó `_type`, variable de entorno u origen: R5 / R8 / R7 cumplidas o anotadas como pendiente manual en `docs/PLAN.md`.
6. Se agregó una entrada en `docs/SESSIONS.md`, y si cambió el comportamiento del sistema, `docs/SPEC.md` está actualizado.

## 6. Protocolo de sesión

- **Al empezar:** leer la última entrada de `docs/SESSIONS.md` y la sección "Ahora" de `docs/PLAN.md`. Confirmar rama (`git status`).
- **Durante:** si aparece un gotcha nuevo (algo que costó descubrir y va a volver a pasar), anotarlo en §7 de este archivo, no solo en la conversación.
- **Al terminar:** agregar entrada en `docs/SESSIONS.md` (plantilla al final de ese archivo), mover tareas en `docs/PLAN.md`.

## 7. Gotchas conocidos (resumen — detalle en CLAUDE.md)

- Cloudflare: variables separadas por scope Production/Preview; "Retry deployment" puede no releer variables → forzar deploy nuevo (commit vacío).
- Cloudflare: "Deploy Hooks" = "Enlaces de implementación" en Configuración → **Desarrollo**.
- Usar la URL alias de rama (`sanity-migration.cas-astro.pages.dev`), no la URL con hash (queda congelada).
- Astro 7: `compressHTML: true` explícito; el default `'jsx'` pega texto a los íconos.
- Pages Functions no tiene sockets TCP → email solo por API HTTP (no SMTP).
- Mailjet y Resend usan remitentes distintos (`CONTACT_FROM_EMAIL` vs `RESEND_FROM_EMAIL`). Resend en sandbox solo entrega al email dueño de la cuenta.
- Hero con Vimeo/YouTube no puede tener efecto ASCII (iframe cross-origin) — por diseño, no bug.
- `sanity deploy --url` se ignora si hay `appId` en `sanity.cli.ts` (ver CLAUDE.md para renombrar).
- Orden de casos: `migracion.sourceId desc` (no hay fecha de publicación original).
- `tsconfig.json`: si se define `exclude`, TypeScript pierde los excludes por defecto (`node_modules`) — listarlos a mano. Sin excluir `studio/`/`migration/`, `astro check` se queda sin memoria.
