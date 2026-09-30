# PLAN — CAS sitio + Sanity

Backlog priorizado. Se actualiza al cierre de cada sesión (ver [AGENTS.md § 6](../AGENTS.md#6-protocolo-de-sesión)).
Esfuerzo: **S** (< 1 h) · **M** (medio día) · **L** (1–3 días). Revisión técnica base: 30/09/2026.

## Ahora — bloqueantes / riesgo antes del cutover

| ID | Tarea | Por qué | Esf. |
| :--- | :--- | :--- | :--- |
| T6 | Pendientes manuales de [CUTOVER.md](../CUTOVER.md): probar webhook punta a punta, re-probar formulario con Mailjet principal, variables en Preview | Checklist abierto | — |

## Cuando haya dominio definitivo

El sitio sigue en desarrollo (funciona en `cas-sitio.pages.dev`), todavía no hay dominio asignado. Estas tareas dependen de él:

| ID | Tarea | Por qué | Esf. |
| :--- | :--- | :--- | :--- |
| T3 | **SEO:** `@astrojs/sitemap` con i18n, `<link rel="canonical">` y `hreflang` en `Layout.astro`, `robots.txt` con el sitemap, `site` correcto en `astro.config.mjs` | WordPress (Yoast/Polylang) ya los emitía; perderlos al cortar afecta indexación. Sitemap y canonical necesitan la URL definitiva | M |
| T4 | **Redirecciones WP → nuevo** en `public/_redirects` | Evitar 404 y pérdida de posicionamiento el día del cambio de DNS. Solo aplica si el dominio nuevo reemplaza a `contenidosad.com` / `contentad.net` | M |
| T4b | Dominio en Cloudflare + CORS de Sanity + verificar Resend con ese dominio + cargar `PUBLIC_SITE_URL` con la URL real | Ver [CUTOVER.md § 6](../CUTOVER.md) | — |

## En pausa (a rever)

| ID | Tarea | Motivo de la pausa |
| :--- | :--- | :--- |
| T5 | Cloudflare Turnstile en el formulario | Pide tarjeta de crédito en la cuenta. Mientras tanto hay honeypot (hecho 30/09); retomar si igual entra spam |

## Próximo — mejoras técnicas de alto retorno

| ID | Tarea | Por qué | Esf. |
| :--- | :--- | :--- | :--- |
| T7 | **Imágenes responsivas desde Sanity:** en `cms.ts` generar `.width()` + `srcset` (400/800/1200/1600) y `loading="lazy"` fuera del hero | Hoy `imageUrl()` sirve el original a resolución completa (solo `.auto('format')`) → LCP pesado, sobre todo en listados y galerías | M |
| T9 | **Webhook sin filtro por `_type`** (o filtro `!(_id in path("drafts.**"))`) | Elimina de raíz el gotcha recurrente R5: cualquier tipo nuevo dispara rebuild. El costo (algún rebuild de más) es irrelevante a este volumen | S |
| T10 | **Sanity TypeGen** (`sanity schema extract` + `sanity typegen generate`) y usar los tipos generados en `cms.ts` en lugar de interfaces a mano; script `npm run typegen` | Hoy `CasoDoc`, `BloqueDoc`, etc. se escriben a mano y pueden desincronizarse del schema sin que nada avise | M |
| T11 | Fuente única de categorías: exportar la lista desde un archivo compartido (p. ej. `shared/categorias.ts`) importado por Studio y sitio | Elimina la sincronización manual de R6 | S |
| T12 | Singletons blindados en el Studio: `document.newDocumentOptions` y `actions` para impedir crear/duplicar/borrar `paginaHome` y `configuracionSeguimiento` | Hoy se ocultan del listado pero se pueden crear desde "Crear nuevo" → duplicados que el sitio ignora en silencio | S |
| T13 | Tipar `window.am5`/`am5map` (`declare global`) en `CoberturaGlobo.astro` | Lleva la línea base de `astro check` a 0 errores y permite usarlo como gate | S |
| T14 | Scripts en `package.json`: `check`, `typegen`; y un GitHub Action (o paso en Cloudflare) que corra `check` + `build` en PR | Hoy la única verificación es el build de Cloudflare, que no corre el chequeo de tipos | S |
| T15 | Actualizar dependencias menores: `astro` 7.0.7→7.3.x, `sanity`/`@sanity/vision` 6.4→6.17 (raíz **y** studio juntos), `@sanity/astro` 3.5.1, `groq`, `tailwindcss` 4.3. **No** saltar todavía a TypeScript 7, `@sanity/client` 8, `astro-portabletext` 1.0 ni `sanity-plugin-media` 6 (majors, revisar changelog aparte) | Mantenimiento; la brecha de sanity 6.4→6.17 ya es grande | M |

## Después — deuda estructural

| ID | Tarea | Por qué | Esf. |
| :--- | :--- | :--- | :--- |
| T16 | **Consolidar páginas por idioma:** mover el markup de cada página a un componente (`src/views/CasoDetalle.astro`, etc.) que recibe `lang`, y dejar en `pages/`, `pages/en/`, `pages/pt/` solo wrappers de 5 líneas. Textos a `ui.ts` | 14 páginas × 3 = 42 archivos que ya divergieron (el `index.astro` ES tiene 406 líneas, EN 335, PT 343; `casos/[slug]` 207 vs 149). Es la mayor fuente de bugs "funciona en ES, no en EN". Hacerlo de a una página | L |
| T18 | Enviar los 2 emails del formulario en paralelo (`Promise.all`) | Hoy son secuenciales → el visitante espera el doble si Mailjet está lento | S |
| T19 | Verificar dominio en Resend (DNS) para que el fallback entregue a todos | Hoy el fallback solo llega al dueño de la cuenta (sandbox) | S (manual) |
| T20 | Más bloques de page builder (servicios, clientes, CTA) y migrar textos estáticos de la Home a Sanity | Continúa el patrón de `paginaHome`; hoy los textos de la Home viven en 3 archivos `.astro` | L |
| T21 | Limpieza: `public/indexDinamic.html` (reemplazado por `HeroShader`), regla `/Video.mp4` en `_headers` (el archivo ya no existe), archivar `migration/` una vez cerrado el cutover | Ruido | S |
| T22 | Content-Security-Policy en `_headers` (en modo `Report-Only` primero) | Complementa los headers actuales; cuidado con GTM y scripts personalizados | M |
| T23 | Deprecar los dos WordPress (backup final, apagar) | Objetivo original del proyecto | — |

## Dependencias y plugins — qué sobra, qué conviene, qué no

### Se mantienen a propósito (decisión del usuario, 30/09/2026 — no tocar)

| Paquete / archivo | Motivo |
| :--- | :--- |
| `@astrojs/cloudflare` | Queda instalado para el uso en Cloudflare |
| `@astrojs/vercel` + `api/contact.js` | Respaldo "por las dudas" para poder mover el hosting a Vercel sin preparar nada |

### Se ve pesado pero es necesario (no quitar)

`sanity`, `react`, `react-dom`, `react-is`, `styled-components` en la raíz son **peer dependencies obligatorias de `@sanity/astro`** (verificado en su `package.json`). Solo se podrían quitar reemplazando `@sanity/astro` por `@sanity/client` directo en `cms.ts` — viable porque el Studio se deploya aparte y no se usa Visual Editing, pero es una decisión, no una limpieza. Recomendación: dejarlo como está salvo que el tiempo de `npm install` en Cloudflare moleste.

### Conviene agregar

| Plugin | Dónde | Para qué |
| :--- | :--- | :--- |
| `@astrojs/sitemap` | sitio | T3 |
| Cloudflare Turnstile | sitio + function | T5, en pausa |
| `@sanity/language-filter` | studio | Opcional, solo comodidad del editor en el Studio (no cambia nada del sitio): agrega un botón para mostrar solo los campos de un idioma en vez de es/pt/en apilados. A consultar |
| TypeGen (incluido en `sanity` CLI) | ambos | T10 — no es un paquete nuevo |

### Evaluado y no conviene (por ahora)

| Opción | Por qué no |
| :--- | :--- |
| `@sanity/document-internationalization` (un doc por idioma) | El modelo por campo `{es,pt,en}` ya funciona y es más simple para 3 idiomas con slug común |
| `sanity-plugin-internationalized-array` | Mejor para muchos idiomas; migrar el dataset no se justifica con 3 |
| Visual Editing / Presentation | Requiere SSR o un deploy de preview con drafts; el rebuild por webhook alcanza para este volumen |
| `@astrojs/cloudflare` en modo SSR | Sin necesidad de contenido dinámico; estático es más barato y robusto |
| Studio embebido en `/admin` | Ya evaluado y descartado (ver CLAUDE.md) |

### Claude Code (plugins / MCP / skills)

- **Útiles para este repo:** skills `sanity-best-practices`, `cloudflare`, `turnstile-spin`, `web-perf`, `code-review`. El **MCP de Sanity** está configurado pero **requiere autorización** (`/mcp` en una sesión interactiva) — autorizarlo permite consultar/parchear documentos sin scripts con token.
- **No aportan acá:** plugins de Figma, product-management, latcom-marketing-analytics, design (salvo `accessibility-review` puntual). Se pueden deshabilitar a nivel proyecto para reducir ruido.
