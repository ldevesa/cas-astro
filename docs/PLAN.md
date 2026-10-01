# PLAN — CAS sitio + Sanity

Backlog priorizado. Se actualiza al cierre de cada sesión (ver [AGENTS.md § 6](../AGENTS.md#6-protocolo-de-sesión)).
Esfuerzo: **S** (< 1 h) · **M** (medio día) · **L** (1–3 días). Revisión técnica base: 30/09/2026.

## Ahora — bloqueantes / riesgo antes del cutover

| ID | Tarea | Por qué | Esf. |
| :--- | :--- | :--- | :--- |
| T6 | Pendiente manual de [CUTOVER.md](../CUTOVER.md): re-probar el formulario real con Mailjet como principal (enviar un mensaje desde el preview y confirmar que llegan los 2 emails) | Único ítem abierto del checklist antes del dominio | — |

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
| T10 | **Sanity TypeGen** (`sanity schema extract` + `sanity typegen generate`) y usar los tipos generados en `cms.ts` en lugar de interfaces a mano; script `npm run typegen` | Hoy `CasoDoc`, `BloqueDoc`, etc. se escriben a mano y pueden desincronizarse del schema sin que nada avise | M |
| T14b | (Opcional) GitHub Action que corra `npm run build` en cada PR | Cloudflare ya corre check + build en cada push (T14 hecho); solo suma si se empiezan a usar PRs | S |
| T15b | Evaluar majors pendientes, de a uno: `astro-portabletext` 1.0, `@sanity/client` 8, `sanity-plugin-media` 6, TypeScript 7 | Cambios incompatibles posibles; leer changelog antes | M |

## Después — deuda estructural

| ID | Tarea | Por qué | Esf. |
| :--- | :--- | :--- | :--- |
| T16 | **Unificar páginas por idioma** (en curso, página por página): vista única en `src/views/` + wrappers en `pages/`, textos en `ui.ts`, piezas comunes en `components/`. Hecho: listado de casos, detalle de caso, categoría, clientes. Sigue: carreras; al final Home, Contacto y páginas de servicios. Cada página: comparar HTML antes/después y consultar diferencias reales entre idiomas | El usuario va a rediseñar adaptando las páginas actuales: con una vista por página cada ajuste se hace 1 vez, no 3 (6 en el listado). Además `CasoCard` permite rediseñar la tarjeta en un solo lugar | L |
| T19 | Verificar dominio en Resend (DNS) para que el fallback entregue a todos | Hoy el fallback solo llega al dueño de la cuenta (sandbox) | S (manual) |
| T20b | **Home con alternativas** (idea del usuario, no aprobada aún): varias `paginaHome` duplicables, preview de cada una en una URL oculta (`/preview/<slug>`, noindex), y un singleton "Configuración del sitio" con campo "Home activa" (referencia) para elegir cuál se publica como Home. Implica quitar `paginaHome` de `SINGLETON_TYPES` en `studio/sanity.config.ts` | Permite proponer una Home alternativa, mostrarla para aprobación y activarla sin copiar bloques a mano | L |
| T20 | Más bloques de page builder (servicios, clientes, CTA) y migrar textos estáticos de la Home a Sanity | Continúa el patrón de `paginaHome`; hoy los textos de la Home viven en 3 archivos `.astro` | L |
| T21b | Descripción para Google de `/clientes` (ES) dice "Más de 38 marcas" con el número fijo; la franja naranja ya lo calcula solo. Opcional: calcularlo también en la descripción | Se desactualiza al sumar clientes | S |
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
