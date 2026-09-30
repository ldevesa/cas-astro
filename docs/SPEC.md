# SPEC — Sitio CAS sobre Sanity

Especificación del sistema tal como está (estado al 30/09/2026) y los criterios que tiene que seguir cumpliendo.
Si un cambio altera algo de acá, actualizar este archivo en el mismo cambio.

## 1. Objetivo

Reemplazar las dos instalaciones de WordPress (`contenidosad.com` es/pt con Polylang, `contentad.net` en) por:

- un **único proyecto Sanity** con contenido localizado por campo, editable por el equipo de CAS sin depender de terceros;
- un **frontend Astro estático** en Cloudflare Pages que se regenera solo al publicar.

**Fuera de alcance:** e-commerce, login de visitantes, búsqueda interna, blog, SSR/edición en vivo (Visual Editing).

## 2. Actores

| Actor | Qué hace |
| :--- | :--- |
| Visitante | Navega el sitio en es/pt/en, envía el formulario de contacto |
| Editor CAS | Publica casos, clientes, carreras, Home y códigos de seguimiento desde el Studio |
| Vendedores / Marketing | Reciben los emails del formulario |
| Dev / agente | Mantiene código, schemas, deploy |

## 3. Arquitectura

```
Editor ──► Sanity Studio (cas-sitio.sanity.studio)
              │ publica
              ▼
        Sanity dataset "production" ──webhook (filtro por _type)──► Cloudflare Deploy Hook
              ▲                                                         │
              │ GROQ en build (useCdn: false)                          ▼
        Astro build (SSG) ◄──────────────────────────────── Cloudflare Pages (rama main)
                                                                        │
Visitante ──► HTML estático + assets (cdn.sanity.io) ◄──────────────────┘
          └─► POST /api/contact (Pages Function) ──► Mailjet ──(falla)──► Resend
```

## 4. Modelo de contenido (Sanity)

Tipos de objeto de idioma: `localeString`, `localeText`, `localeBlockContent` → `{ es, pt, en }`. Regla de lectura: idioma pedido, si vacío → `es`.

| `_type` | Tipo | Campos principales | Notas |
| :--- | :--- | :--- | :--- |
| `caso` | documento | `titulo`*, `slug`* (es), `subtitulo`, `resumen`, `mercado`, `contenido` (PT), `imagenDestacada`* (+alt, hotspot), `galeria[]`, `videoYoutubeId`, `categorias[]`, `migracion` | 59 migrados. Orden: `migracion.sourceId desc` |
| `cliente` | documento | `nombre`, `logo` | No localizado. 38 migrados |
| `carrera` | documento | `titulo`, `slug`, `tipo`, `categoria`, `areaTrabajo`, `contenido` | 2 migradas |
| `paginaHome` | singleton (`_id: paginaHome`) | `bloques[]` → hoy solo `heroBloque` | Page builder incremental |
| `heroBloque` | objeto | `titulo`, `mostrarTitulo`, `fuenteVideo` (incrustado/vimeo/youtube), `video` (file), `videoUrl`, `efectoActivo` | Efecto ASCII solo con `incrustado` |
| `configuracionSeguimiento` | singleton | `googleTagManagerId`, `googleSiteVerification`, `scriptsPersonalizados` (head), `…Body` (inicio body), `…FinBody` (fin body) | HTML crudo de confianza, sin escapar |

Singletons (`paginaHome`, `configuracionSeguimiento`): en el Studio solo se editan, publican, descartan cambios o restauran versiones; no aparecen en "Crear nuevo" ni se pueden duplicar, borrar o despublicar (`SINGLETON_TYPES` en `studio/sanity.config.ts`).

Categorías de caso válidas: `experiencia`, `contenido-digital`, `trade`, `creatividad` (provisorias, el equipo define la taxonomía final). Fuente única: `studio/schemaTypes/categoriasCaso.ts`.

## 5. Rutas

Cada ruta existe en `/`, `/pt/` y `/en/` con el **mismo slug en español**.

| Ruta | Fuente | Notas |
| :--- | :--- | :--- |
| `/` | `paginaHome` + casos + clientes + estático | Hero configurable, servicios interactivos (4 ítems → categorías) |
| `/que-hacemos`, `/experiencia-de-marca`, `/trade-marketing`, `/carteleria` | estático | |
| `/casos`, `/casos/[page]` | `caso` | Paginación de 6 |
| `/casos/[slug]` | `caso` | Galería, video YouTube, Portable Text, 3 relacionados |
| `/casos/categoria/[categoria]` | `caso` filtrado | 4 categorías |
| `/clientes` | `cliente` | |
| `/carreras`, `/carreras/[slug]` | `carrera` | |
| `/contacto`, `/gracias` | formulario | |

## 6. Requisitos funcionales

- **RF1 — Idiomas.** Selector es/pt/en en toda página, apuntando a la ruta equivalente. Contenido faltante en un idioma cae a español sin romper la página.
- **RF2 — Publicación sin dev.** Publicar en el Studio un `_type` incluido en el filtro del webhook dispara un rebuild; el cambio se ve en minutos sin tocar código.
- **RF3 — Hero configurable.** Video subido a Sanity (con/sin efecto ASCII) o embed de Vimeo/YouTube; título opcional.
- **RF4 — Formulario de contacto.** Campos obligatorios: nombre, email, mensaje. Por envío se mandan 2 emails independientes:
  - vendedores (`CONTACT_TO`) sin datos de origen;
  - marketing (`CONTACT_TO_MARKETING`, opcional) con UTMs, dispositivo y geo (`request.cf`), + `CONTACT_BCC`.
  - Cada uno: Mailjet → si falla, Resend (desactivable con `RESEND_FALLBACK_ENABLED=false`). Respuesta OK si llegó al menos uno.
  - Todo dato del visitante se escapa antes de ir al HTML del email.
  - Anti-spam: honeypot `website` (campo oculto). Si llega con valor → responde `{ok:true}` sin mandar emails.
- **RF5 — Atribución.** UTMs capturados en cualquier página (ventana deslizante de 3 h en `localStorage`), con detección de buscador orgánico, directo y referral.
- **RF6 — Seguimiento editable.** GTM, verificación de Search Console y snippets sueltos en 3 puntos de inyección, cargables desde el Studio.
- **RF7 — Filtro por categoría.** Los ítems de servicios de la Home enlazan a `/casos/categoria/<cat>`.

## 7. Requisitos no funcionales

- **RNF1 — Costo:** dentro del free tier de Sanity y Cloudflare Pages.
- **RNF2 — Sin dependencia de terceros para operar:** el equipo publica sin intervención de dev; el dev puede reconstruir todo desde el repo + variables de entorno documentadas.
- **RNF3 — Seguridad:** headers de `public/_headers` (X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy); login del CMS fuera del dominio público; secretos solo en variables de Cloudflare.
- **RNF4 — Rendimiento:** HTML estático, assets con cache larga, fuentes no bloqueantes, videos secundarios con `preload="none"`.
- **RNF5 — Reproducibilidad:** migración WP→Sanity idempotente (`migration/`).

## 8. Integraciones y configuración

| Servicio | Uso | Configuración |
| :--- | :--- | :--- |
| Sanity | Contenido + assets | `PUBLIC_SANITY_PROJECT_ID`, `PUBLIC_SANITY_DATASET`; CORS: localhost:4321, `*.pages.dev` usados; falta `contenidosad.com` |
| Cloudflare Pages | Hosting + Functions | Build `npm run build`, output `dist`, Node 22; variables en Production **y** Preview; `PUBLIC_SITE_URL` opcional (base de `og:image`, default `https://cas-sitio.pages.dev`) |
| Mailjet | Email principal | `MJ_APIKEY_PUBLIC`, `MJ_APIKEY_PRIVATE`, `CONTACT_FROM_EMAIL` |
| Resend | Email fallback | `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_FALLBACK_ENABLED` |
| Destinatarios | | `CONTACT_TO`, `CONTACT_TO_MARKETING`, `CONTACT_BCC`, `CONTACT_FROM_NAME` |
| GTM / Search Console | Medición | Desde el Studio (`configuracionSeguimiento`) |
| amCharts (globo), Three.js (shader) | Visuales | Cliente |

## 9. Criterios de aceptación globales

1. Las ~243 páginas se generan sin errores con el dataset actual.
2. Toda ruta de §5 responde 200 en los 3 idiomas; ningún caso sin traducción rompe.
3. Publicar en el Studio → rebuild automático → cambio visible en la URL alias.
4. Formulario: con Mailjet caído y Resend configurado, el email igual sale.
5. Sin errores de CORS en consola con el Hero incrustado + efecto activo.

## 10. Limitaciones conocidas (aceptadas)

- Se pierde `<u>` del contenido migrado (no es decorator del schema).
- Rexona sin EN, Cif sin PT (así estaba en WordPress). `areaTrabajo.en` vacío en carreras.
- Sin fecha de publicación original: orden aproximado por `sourceId`.
- Selector de destinatario en el formulario: **no implementar** hasta que se pida.
