# CAS — Migración a Sanity CMS

Este directorio es un **git worktree** separado del proyecto principal (`../cas-astro`), en la rama `sanity-migration`. Es una copia de trabajo aislada para experimentar con la migración de contenido de WordPress a Sanity.io **sin arriesgar el sitio en producción**, que sigue corriendo desde `../cas-astro` en la rama `main`.

## Por qué se hace esta migración

El sitio actual (`cas-astro`) es un frontend Astro estático que consume contenido de **dos instancias de WordPress**:
- `contenidosad.com` — español y portugués (vía plugin Polylang)
- `contentad.net` — inglés (instalación separada)

El dolor a resolver: una empresa externa administra esas instancias de WordPress y demora las actualizaciones de plugins, generando dependencia operativa. La idea es migrar a **Sanity.io** (CMS headless) para:
1. Eliminar la dependencia de WordPress y de terceros para mantenerlo.
2. Consolidar **ambos idiomas en un solo proyecto/dataset de Sanity**, con campos localizados (`{ es, pt, en }` por campo) en vez de dos instalaciones separadas.
3. El free tier de Sanity (2 datasets, 500K requests CDN/mes, 20GB assets) alcanza de sobra para el volumen de contenido de este sitio.

## Estado actual

- [x] Worktree creado (`git worktree add ../cas-astro-sanity -b sanity-migration`)
- [x] `npm install` corrido en esta carpeta
- [x] Proyecto Sanity.io creado (`npm create sanity@latest`) en `studio/` — projectId `21wszpvy`, dataset `production`, TypeScript, MCP configurado para Claude
- [x] Schemas de **Caso**, **Cliente** y **Carrera** definidos en `studio/schemaTypes/` con campos localizados (`localeString`, `localeText`, `localeBlockContent` en `studio/schemaTypes/objects/`)
- [x] Migración de contenido ejecutada: scripts en `migration/` (extract → match EN↔ES/PT → transform HTML→Portable Text → import vía `@sanity/client`). **99/99 documentos migrados y validados** (`npx sanity documents validate`): 59 casos, 2 carreras, 38 clientes, 368 imágenes subidas como assets. Ver `migration/reports/` para detalle (matching EN, incidencias, reporte de import). Reproducible: `cd migration && npm run extract && npm run match && npm run transform && npm run import` (idempotente, cachea assets ya subidos en `migration/reports/asset-map.json`).
  - Incidencias de contenido de origen (no son bugs, así está en WordPress): caso **Rexona** sin versión en inglés; caso **Cif** sin versión en portugués; carrera *Analista de Tráfico y Producción* existe solo en `contentad.net` (EN) sin equivalente vigente en ES/PT — se descartó, no se migró. Las carreras EN migradas tienen `areaTrabajo.en` vacío porque el ACF de esos posts en `contentad.net` está vacío.
  - Fidelidad del rich text: el conversor HTML→Portable Text no preserva `<u>` (subrayado) porque no está definido como decorator en el schema (se pierde el subrayado, no el texto). Sin impacto de contenido, solo de énfasis visual menor.
- [x] `src/lib/wp.ts` reemplazado por `src/lib/cms.ts` (integración oficial `@sanity/astro`, queries GROQ con `defineQuery`, imágenes vía `@sanity/image-url`, rich text vía `astro-portabletext`). Datos estáticos que no venían de WordPress (`getStaticSiteData`) se movieron a `src/lib/site-data.ts`, sin relación con el CMS.
  - `cms.ts` resuelve el idioma pedido en el momento de la query (con fallback a `es` si falta la traducción) y devuelve objetos planos (`caso.titulo`, `caso.imagenUrl`, etc.) — ya no hace falta llamar a getters como `getCasoImage(caso)`, son propiedades directas.
  - Orden de los casos: por `migracion.sourceId desc` (aproximación al orden original de WordPress, ya que la fecha de publicación original no se preservó en la migración — ver nota en `migration/reports/`).
  - Todas las páginas de `src/pages/` (y sus equivalentes `en/`, `pt/`) actualizadas — 35 archivos en total. Verificado con `npx astro check` (0 errores nuevos; quedan 8 preexistentes sin relación en `CoberturaGlobo.astro`) y `npm run build` (243 páginas generadas OK). Probado en `astro preview` contra las 3 idiomas: detalle de caso con galería/video/Portable Text, carreras con listas, fallback a ES cuando falta traducción (caso Rexona en `/en/`), paginación PT.
  - `astro.config.mjs` lee `PUBLIC_SANITY_PROJECT_ID`/`PUBLIC_SANITY_DATASET` (ver `.env.example`) — **hay que configurar estas 2 variables en Cloudflare Pages** antes del próximo deploy a producción, si no el build va a fallar por falta de projectId/dataset.
- [x] Rama `sanity-migration` pusheada a GitHub y deployment de preview funcionando en Cloudflare Pages (proyecto `cas-astro`), en paralelo al sitio de producción (`main`), sin tocarlo. **Gotcha real que nos pasó:** Cloudflare Pages separa variables de entorno por scope **Production** / **Preview** — si se agregan solo en Production, el build de una rama que no sea `main` falla con `Configuration must contain projectId` aunque las variables "existan" en el proyecto. Además, un simple **"Retry deployment"** no siempre relee variables recién agregadas; si el retry vuelve a fallar con el mismo error después de corregir las variables, forzar un deployment nuevo (commit vacío + push) en vez de reintentar el fallido.
- [x] `README.md` y `MANUAL.md` reescritos para reflejar el flujo con Sanity (Studio en vez de wp-admin, GROQ en vez de REST, webhook de Sanity en vez de WP Webhooks, variables de entorno nuevas, troubleshooting actualizado con el error real de `projectId` que nos pasó).
- [x] Astro actualizado a v7.0.7 (desde 6.1.5). Requirió `compressHTML: true` explícito en `astro.config.mjs` porque el nuevo default (`'jsx'`) pegaba el texto a los íconos en todo el sitio (patrón `<span>icono</span> Texto`). Build y `astro check` verificados, sin errores nuevos.
- [x] Webhook de Sanity → Cloudflare armado y probado de punta a punta (apuntando a `sanity-migration`, no a `main` todavía — ver detalle y qué falta para producción en [CUTOVER.md § 4](CUTOVER.md)). Publicar en el Studio dispara un rebuild solo. **Gotcha:** en el panel nuevo de Cloudflare, "Deploy Hooks" pasó a llamarse **"Enlaces de implementación"**, dentro de Configuración → **Desarrollo** (no en "General", donde parece más lógico buscarlo). Y importante: usar la URL alias de la rama (`sanity-migration.cas-astro.pages.dev`) para ver los cambios, no la URL con hash de un deployment puntual — esa queda congelada para siempre en el contenido de ese build.
- [x] Sanity Studio deployado en https://cas-sanity.sanity.studio (`cd studio && npx sanity deploy --url=cas-sanity`, `appId` guardado en `sanity.cli.ts` para que futuros deploys no pregunten nada). Se evaluó embeberlo en el sitio (`contenidosad.com/admin` vía `studioBasePath` de `@sanity/astro`) contra deployarlo aparte — se eligió aparte: cero dependencias/config nuevas en el sitio, no depende de en qué dominio esté el sitio en cada momento (útil justo ahora que todavía estamos en preview), y el login del CMS queda fuera del dominio público. Si en el futuro se prefiere la URL embebida, queda documentada la opción.
- [x] Primer bloque de un **page builder** para la Home: documento singleton `paginaHome` (`studio/schemaTypes/paginaHome.ts`) con un array `bloques`, hoy con un solo tipo (`heroBloque`: título localizado, video de fondo, toggle para activar/desactivar el efecto ASCII). Patrón pensado para sumar más bloques de a uno, incrementalmente. `HeroShader.astro` ahora recibe el video por prop en vez de tenerlo hardcodeado.
  - **Gotcha 1 — filtro del webhook:** el webhook de Sanity→Cloudflare se armó con el filtro `_type in ["caso", "cliente", "carrera"]` *antes* de que existiera `paginaHome`. Publicar cambios en Página Home no disparaba ningún rebuild hasta que actualizamos el filtro a `_type in ["caso", "cliente", "carrera", "paginaHome"]`. **Cada vez que se agregue un `_type` de documento nuevo, hay que revisar/actualizar este filtro.**
  - **Gotcha 2 — CORS del CDN de archivos:** las imágenes de Sanity (`cdn.sanity.io/images/...`) cargan sin restricción de origen, pero los archivos genéricos como video (`cdn.sanity.io/files/...`) sí exigen que el origen esté en la lista de CORS del proyecto **cuando el elemento HTML pide el recurso con `crossOrigin="anonymous"`** (necesario acá porque Three.js necesita leer los píxeles del video para el shader). Sin esto tira `CORS Origin not allowed` (403) en el navegador, aunque `curl` normal (sin header `Origin`) responda 200 sin problema — por eso no se detecta con un chequeo simple de que la URL "funciona". Se agregaron `http://localhost:4321` y `https://sanity-migration.cas-astro.pages.dev` con `npx sanity cors add <origin> --no-credentials` (desde `studio/`). **Falta agregar el dominio de producción (`https://contenidosad.com`) antes del cutover** — ver [CUTOVER.md](CUTOVER.md).
- [ ] Pasar a producción (mergear `sanity-migration` → `main`) — checklist completo en [CUTOVER.md](CUTOVER.md)
- [ ] Decidir si/cuándo deprecar los dos WordPress (parte del checklist de arriba)

## Contenido actual a migrar (Custom Post Types de WordPress)

Definidos en `src/lib/wp.ts` del proyecto original (`../cas-astro/src/lib/wp.ts`):

| CPT | Campos ACF | Dónde se usa |
| :--- | :--- | :--- |
| **Casos** | `resumen`, `subtitulo`, `mercados`, `titulo_mercado`, `post_campana` (embed YouTube), `image_carousel` | `/casos`, `/casos/[slug]` |
| **Clientes** | solo título + imagen destacada (logo) | Carrusel en home |
| **Carreras** | `tipo`, `area_trabajo`, `categoria`, `fecha` | `/carreras`, `/carreras/[slug]` |

Además hay datos estáticos hardcodeados en `getStaticSiteData()` (oficinas, redes sociales) que no vienen de WordPress — se pueden mantener como están o migrar a Sanity también si se quiere centralizar todo.

## Arquitectura i18n del sitio (para replicar en Sanity)

- **Idiomas:** español (default, sin prefijo), portugués (`/pt`), inglés (`/en`)
- **Slugs de URL:** siempre en español, incluso para las versiones en/pt (ej: `/en/que-hacemos`, no `/en/what-we-do`)
- Strings de UI (nav, footer) están en `src/i18n/ui.ts` — no vienen de WordPress, se mantienen igual
- El helper `getLangSwitcherPaths()` en `src/i18n/utils.ts` arma las URLs equivalentes en los 3 idiomas

## Recomendación para el modelo de datos en Sanity

En vez de 3 documentos separados por idioma (como las 2 instalaciones de WP actuales), usar **un documento por caso/cliente/carrera** con campos de texto localizados, ej:

```ts
// schema de ejemplo para "caso"
{
  name: 'caso',
  type: 'document',
  fields: [
    { name: 'slug', type: 'slug' },
    { name: 'titulo', type: 'object', fields: [
      { name: 'es', type: 'string' },
      { name: 'pt', type: 'string' },
      { name: 'en', type: 'string' },
    ]},
    // ... resumen, subtitulo, mercado, etc. con la misma estructura
    { name: 'imagenDestacada', type: 'image' },
    { name: 'galeria', type: 'array', of: [{ type: 'image' }] },
    { name: 'videoYoutubeId', type: 'string' },
  ]
}
```

Esto simplifica mucho respecto al esquema actual (2 WordPress + Polylang).

## Notas para Claude en esta carpeta

- **No tocar `../cas-astro`** — ese es el proyecto en producción, en la rama `main`, deployando a Cloudflare Pages. Esta carpeta es 100% experimental.
- Cuando la migración esté validada, el merge de `sanity-migration` a `main` es una decisión explícita del usuario, no automática.
- El resto de la documentación operativa (deploy, Cloudflare, formularios, etc.) está en `../cas-astro/README.md` y `../cas-astro/MANUAL.md` — aplican igual a esta copia salvo por la parte de WordPress, que es justamente lo que se está reemplazando.
