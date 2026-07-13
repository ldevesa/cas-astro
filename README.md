# CAS — Contenidos Advertising | Sitio Web

Sitio web institucional de CAS construido con **Astro + Tailwind CSS**, conectado a **Sanity como CMS headless** vía GROQ. Soporta tres idiomas (español, portugués, inglés) con contenido localizado en un solo dataset, y se despliega como sitio 100% estático en Cloudflare Pages.

---

## Stack tecnológico

| Tecnología | Uso |
| :--- | :--- |
| [Astro 6](https://astro.build) | Framework principal, generación estática, View Transitions |
| [Tailwind CSS v4](https://tailwindcss.com) | Estilos utilitarios |
| [Sanity](https://www.sanity.io) + [`@sanity/astro`](https://github.com/sanity-io/sanity-astro) | CMS headless (casos, clientes, carreras) — Studio en `studio/` |
| [`astro-portabletext`](https://github.com/theisel/astro-portabletext) | Render del rich text (Portable Text) de Sanity |
| [`@sanity/image-url`](https://www.sanity.io/docs/image-url) | URLs de imágenes optimizadas servidas por el CDN de Sanity |
| [`sanity-plugin-media`](https://github.com/sanity-io/sanity-plugin-media) | Browser de todos los assets del proyecto dentro del Studio (equivalente a "Media" de WordPress) |
| [amCharts 5](https://www.amcharts.com) | Globo 3D y mapas de cobertura global |
| [Mailjet](https://www.mailjet.com) | Envío de emails del formulario de contacto |
| [Cloudflare Pages](https://pages.cloudflare.com) | Hosting + Functions (API serverless) |
| TypeScript | Tipado en capa de datos |

---

## Estructura del proyecto

```
cas-astro-sanity/
├── public/
│   ├── assets/
│   │   └── globo/
│   │       ├── globo.js        ← lógica del globo 3D y mapas (amCharts)
│   │       ├── globo-data.js   ← coordenadas de ciudades con presencia CAS
│   │       └── globo.css       ← estilos del contenedor del globo
│   ├── img/                    ← imágenes estáticas (logo, íconos)
│   ├── video/                  ← videos de servicios
│   ├── Video.mp4               ← video del hero principal
│   ├── favicon-cas.png         ← favicon del sitio
│   ├── robots.txt              ← reglas para buscadores
│   └── _headers                ← headers HTTP (caché + seguridad) para Cloudflare Pages
├── functions/
│   └── api/
│       └── contact.js          ← función serverless (Cloudflare Pages Function)
│                                  maneja el POST del formulario de contacto
├── studio/                     ← Sanity Studio (la interfaz de edición de contenido)
│   └── schemaTypes/
│       ├── caso.ts             ← schema de Caso
│       ├── cliente.ts          ← schema de Cliente
│       ├── carrera.ts          ← schema de Carrera
│       └── objects/            ← tipos reutilizables: localeString, localeText,
│                                  localeBlockContent (rich text), migracion
├── migration/                  ← scripts de la migración WordPress → Sanity (uso puntual,
│                                  ver el README propio de esa carpeta si hace falta rerun)
├── src/
│   ├── components/
│   │   ├── HeroShader.astro        ← hero animado con efecto de puntos (Three.js vía iframe)
│   │   ├── ClientesCarousel.astro  ← carrusel de logos de clientes
│   │   └── CoberturaGlobo.astro    ← sección con globo 3D y mapas, lazy loaded
│   ├── i18n/
│   │   ├── ui.ts               ← strings traducidos (nav, footer, etc.)
│   │   └── utils.ts            ← helpers: useTranslations(), getLang(), getLangSwitcherPaths()
│   ├── layouts/
│   │   └── Layout.astro        ← shell HTML: nav, footer, lang switcher, View Transitions
│   ├── lib/
│   │   ├── cms.ts              ← capa de datos: queries GROQ a Sanity, tipos, resolución de idioma
│   │   └── site-data.ts        ← datos estáticos que no vienen del CMS (oficinas, redes sociales)
│   ├── pages/
│   │   ├── index.astro         ← Home (ES)
│   │   ├── que-hacemos.astro
│   │   ├── experiencia-de-marca.astro
│   │   ├── carteleria.astro
│   │   ├── trade-marketing.astro
│   │   ├── clientes.astro
│   │   ├── contacto.astro
│   │   ├── gracias.astro       ← página de gracias post-formulario (ES)
│   │   ├── casos/
│   │   │   ├── index.astro     ← listado de casos
│   │   │   └── [slug].astro    ← detalle de caso
│   │   ├── carreras/
│   │   │   ├── index.astro     ← listado de búsquedas laborales
│   │   │   └── [slug].astro    ← detalle de búsqueda
│   │   ├── en/                 ← mismas páginas en inglés (mismos slugs en español)
│   │   │   ├── index.astro
│   │   │   ├── contacto.astro
│   │   │   ├── gracias.astro
│   │   │   └── ...
│   │   └── pt/                 ← mismas páginas en portugués
│   │       ├── index.astro
│   │       ├── contacto.astro
│   │       ├── gracias.astro
│   │       └── ...
│   └── styles/
│       └── global.css          ← design system: colores, tipografías, dark mode
├── .env                        ← variables locales (NO subir a git)
├── .env.example                ← plantilla de variables
└── astro.config.mjs
```

---

## Multiidioma (i18n)

El sitio tiene tres idiomas: **español** (por defecto), **portugués** y **inglés**.

### Cómo funciona el routing

- **Español** → sin prefijo: `contenidosad.com/casos`
- **Portugués** → prefijo `/pt`: `contenidosad.com/pt/casos`
- **Inglés** → prefijo `/en`: `contenidosad.com/en/casos`

**Importante:** los slugs de URL son siempre en español, incluso para inglés y portugués. Ejemplo:
- `/en/que-hacemos` (no `/en/what-we-do`)
- `/en/experiencia-de-marca` (no `/en/brand-experience`)

Esto simplifica el routing y evita duplicar lógica de redirecciones. El contenido dinámico (casos, carreras) usa el **mismo documento y el mismo slug** para los 3 idiomas — es un solo `caso` en Sanity con campos `{es, pt, en}` por dentro, no 3 documentos distintos.

### Cómo agregar o editar traducciones

Los strings de UI (navegación, footer, labels) que **no vienen de Sanity** están en [`src/i18n/ui.ts`](src/i18n/ui.ts).

```ts
export const ui = {
  es: { 'nav.home': 'Inicio', ... },
  pt: { 'nav.home': 'Início', ... },
  en: { 'nav.home': 'Home',   ... },
};
```

Para usar en cualquier componente o página:

```astro
---
import { useTranslations } from '../i18n/utils';
const locale = Astro.currentLocale ?? 'es';
const t = useTranslations(locale);
---
<p>{t('nav.home')}</p>
```

El contenido editorial (casos, carreras) se traduce en el Sanity Studio, no acá — ver la sección [Contenido desde Sanity](#contenido-desde-sanity).

### Cambio de idioma

El selector de idioma en el nav detecta automáticamente la URL actual y genera los links a la misma página en los otros idiomas. Esto está implementado en `getLangSwitcherPaths()` en [`src/i18n/utils.ts`](src/i18n/utils.ts).

---

## Formulario de contacto

El formulario usa **Mailjet** para el envío. No depende de Sanity ni de ningún servidor SMTP.

### Flujo

1. El usuario completa el formulario y hace click en "Enviar"
2. El navegador hace un `fetch POST` a `/api/contact` con los datos en `FormData`
3. La **Cloudflare Pages Function** en `functions/api/contact.js` recibe el request
4. La función llama a la API REST de Mailjet con autenticación Basic (API key + secret)
5. Mailjet envía el email a los destinatarios configurados
6. El formulario muestra un mensaje de éxito y redirige a `/gracias` (o `/pt/gracias`, `/en/gracias`)

### Campos del formulario

| Campo | Nombre en el POST |
| :--- | :--- |
| Nombre | `nombre` |
| Email | `email` |
| Teléfono | `telefono` |
| Cargo en la empresa | `cargo` |
| País | `pais` |
| Servicio de interés | `servicio` |
| Mensaje | `mensaje` |

### Variables de entorno necesarias

Estas variables se configuran en el panel de Cloudflare Pages (Settings → Environment variables):

| Variable | Descripción |
| :--- | :--- |
| `MJ_APIKEY_PUBLIC` | API key pública de Mailjet |
| `MJ_APIKEY_PRIVATE` | API key privada de Mailjet |
| `CONTACT_FROM_EMAIL` | Email remitente (ej: `info@contenidosad.com`) |
| `CONTACT_FROM_NAME` | Nombre del remitente (ej: `CAS`) |
| `CONTACT_TO` | Destinatarios principales, separados por coma |
| `CONTACT_BCC` | Destinatarios en copia oculta, separados por coma |

Ejemplo para desarrollo local en `.env`:
```env
MJ_APIKEY_PUBLIC=tu_api_key_aqui
MJ_APIKEY_PRIVATE=tu_api_secret_aqui
CONTACT_FROM_EMAIL=info@contenidosad.com
CONTACT_FROM_NAME=CAS
CONTACT_TO=mail1@empresa.com,mail2@empresa.com
CONTACT_BCC=copia@empresa.com
```

---

## Contenido desde Sanity

El contenido editable (**Caso**, **Cliente**, **Carrera**) vive en un dataset de Sanity y se edita desde el **Sanity Studio** (carpeta `studio/` — correlo con `cd studio && npm run dev`, o deployado en una URL pública si se configuró `sanity deploy`).

El sitio toma ese contenido en tiempo de **build** (no en runtime) usando GROQ, vía [`src/lib/cms.ts`](src/lib/cms.ts):

| Función | Qué trae |
| :--- | :--- |
| `getCasos(lang, count?)` / `getAllCasos(lang)` / `getCasosPage(page, perPage, lang)` | Casos, resueltos al idioma pedido |
| `getCasoBySlug(slug, lang)` | Un caso puntual |
| `getCarreras(lang)` / `getCarreraBySlug(slug, lang)` | Carreras |
| `getClientes()` | Clientes (no localizado, ver más abajo) |

Cada documento (`caso`, `carrera`) guarda los campos de texto como objetos `{ es, pt, en }` (tipos `localeString`/`localeText`/`localeBlockContent` en `studio/schemaTypes/objects/`). `cms.ts` resuelve el idioma pedido en el momento de la query, con **fallback automático a español** si falta la traducción — así nunca se rompe una página por una traducción faltante. `Cliente` no tiene campos localizados (el nombre de una marca es igual en los 3 idiomas).

El rich text (contenido largo de un caso o una carrera) se guarda como **Portable Text** (no HTML) y se renderiza con `<PortableText value={...} />` de `astro-portabletext`. Las imágenes se sirven optimizadas desde el CDN de Sanity vía `@sanity/image-url`.

### Actualizar el sitio cuando se edita contenido en Sanity

**Importante:** como el sitio es estático (SSG), el contenido se trae **en tiempo de build** y se congela en HTML. Publicar un cambio en el Studio **no se refleja automáticamente** en el front — hay que regenerar el sitio, igual que pasaba antes con WordPress.

Las páginas que consumen Sanity usan `getStaticPaths()`:
- [`src/pages/casos/index.astro`](src/pages/casos/index.astro)
- [`src/pages/casos/[slug].astro`](src/pages/casos/[slug].astro)
- [`src/pages/casos/[page].astro`](src/pages/casos/[page].astro)
- [`src/pages/carreras/index.astro`](src/pages/carreras/index.astro) y [`[slug].astro`](src/pages/carreras/[slug].astro)
- [`src/pages/clientes.astro`](src/pages/clientes.astro)
- Equivalentes en `/en/` y `/pt/`

Opciones para regenerar el sitio (sin tocar código):

| Opción | Cómo | Cuándo usarla |
| :--- | :--- | :--- |
| **Manual** | Cloudflare Pages → Deployments → "Retry deployment" o "Create deployment" | Cambios puntuales, no urgentes |
| **Webhook de Sanity** | Ver pasos abajo | Publicación/edición frecuente |
| **Commit vacío** | `git commit --allow-empty -m "rebuild" && git push` | Rebuild rápido desde la terminal |

#### Configurar el webhook de Sanity (ya armado, ver [CUTOVER.md](CUTOVER.md))

Para que el sitio se actualice automáticamente cuando se publica o edita un documento en el Studio:

1. En Cloudflare Pages → Configuración → **Desarrollo** (en el panel actual de Cloudflare esto se llama así, no "Builds & Deployments") → sección **"Enlaces de implementación"** ("Deploy Hooks") → crear uno (nombre sugerido: "Sanity publish") → copiar la URL generada.
2. En [sanity.io/manage](https://sanity.io/manage) → proyecto → **API** → **Webhooks** → "Create webhook".
3. Dataset: `production`. Trigger on: `Create`, `Update`, `Delete`. Filter (GROQ, opcional): `_type in ["caso", "cliente", "carrera"]` para que solo dispare con esos tipos.
4. URL: pegar la del Deploy Hook de Cloudflare.
5. Guardar.
6. Verificar en el log de intentos del webhook (sanity.io/manage → API → Webhooks → click en el webhook) que devuelva `"resultCode": 200`. El deployment que dispara se ve en la **URL alias de la rama** (`https://<rama>.cas-astro.pages.dev`), no en la URL con hash de un deployment puntual — esa última queda fija en el contenido de ese build para siempre.

Resultado: editar un documento en el Studio → 1-2 minutos → el sitio se actualiza solo.

#### Alternativa: migrar a SSR / Visual Editing

Si se necesita que los cambios aparezcan **instantáneamente** sin rebuild, hay dos caminos: migrar a SSR (server-side rendering, usando el adapter de Cloudflare o Vercel — ambos ya están instalados como dependencias, implica agregar `output: 'server'` en `astro.config.mjs`) o adoptar el **Presentation Tool** de Sanity (Visual Editing) para preview en vivo dentro del Studio sin tocar el sitio público. Ambos son cambios más grandes, fuera del alcance de esta migración inicial.

---

## Globo 3D de cobertura

El componente [`CoberturaGlobo.astro`](src/components/CoberturaGlobo.astro) muestra un globo interactivo y mapas con las ciudades donde CAS tiene presencia.

### Carga lazy (optimización de performance)

amCharts es una librería pesada. Para no bloquear la carga inicial de la página, los scripts se cargan **solo cuando el usuario llega a esa sección** del scroll (usando `IntersectionObserver`).

Orden de carga:
1. `globo.css` (estilos del contenedor)
2. `amcharts/index.js`
3. `amcharts/map.js`
4. `amcharts/geodata/worldLow.js`
5. `amcharts/themes/Animated.js`
6. `globo-data.js` (coordenadas de ciudades)
7. `globo.js` (lógica de renderizado)

Una vez cargados todos, se llama a `window.initCasGlobe()` que inicializa los tres paneles (globo, mapa de alcance, mapa de centros de negocio).

### Agregar o modificar ciudades

Editar [`public/assets/globo/globo-data.js`](public/assets/globo/globo-data.js). Cada ciudad es un objeto:

```js
{ city: "Buenos Aires", country: "Argentina", lat: -34.6, lng: -58.38 }
```

Los "centros de negocio" (tercer panel) son las ciudades filtradas por nombre en `globo.js`:
```js
["Buenos Aires", "Mexico City", "Madrid", "Miami"]
```

---

## Performance

### Estrategias aplicadas

| Optimización | Detalle |
| :--- | :--- |
| amCharts lazy load | Se carga solo al hacer scroll hasta la sección del globo |
| Google Fonts no bloqueante | `media="print" onload="this.media='all'"` + preload |
| `globo.css` no bloqueante | Se inyecta dinámicamente junto con los scripts del globo |
| Cache 1 año en imágenes y videos | Configurado en `public/_headers` |
| Cache 1 año + `immutable` en assets de Astro | Los archivos `/_astro/*` tienen hash en el nombre |
| Video hero sin autoplay en mobile | Reduce datos móviles |
| Imágenes de Sanity servidas vía CDN | `@sanity/image-url` con `.auto('format')` (webp/avif automático) |

### Imágenes

Las imágenes estáticas en `public/img/` tienen cache de 1 año. Si se reemplaza una imagen, hay que **renombrar el archivo** para que los navegadores descarguen la versión nueva (o limpiar el caché de Cloudflare desde el panel).

Las imágenes de contenido (casos, clientes) vienen del CDN de Sanity con hash en la URL — no tienen este problema, cada imagen nueva ya tiene una URL distinta.

---

## Headers HTTP

El archivo [`public/_headers`](public/_headers) configura los headers que Cloudflare Pages aplica a cada respuesta:

- **Seguridad:** `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`
- **Cache:** 1 año para imágenes, videos, fonts y assets de Astro

---

## Variables de entorno

Copiá el archivo de ejemplo y completá los valores:

```bash
cp .env.example .env
```

| Variable | Descripción |
| :--- | :--- |
| `PUBLIC_SANITY_PROJECT_ID` | ID del proyecto de Sanity (ver `studio/sanity.config.ts`) |
| `PUBLIC_SANITY_DATASET` | Dataset a consumir (`production`) |
| `MJ_APIKEY_PUBLIC` / `MJ_APIKEY_PRIVATE` | Mailjet |
| `CONTACT_*` | Formulario de contacto |

Para producción, las variables se configuran en el panel de Cloudflare Pages (no en archivos subidos al repo) — **por separado para el scope Production y el scope Preview**, ver [MANUAL.md](MANUAL.md#5-cloudflare-pages).

---

## Comandos

Desde la raíz del proyecto:

| Comando | Acción |
| :--- | :--- |
| `npm install` | Instala dependencias |
| `npm run dev` | Dev server en `http://localhost:4321` |
| `npm run build` | Genera el sitio estático en `./dist/` |
| `npm run preview` | Preview local del build |

Desde `studio/`:

| Comando | Acción |
| :--- | :--- |
| `npm run dev` | Sanity Studio en `http://localhost:3333` |
| `npm run deploy` | Publica el Studio en una URL pública (`<project>.sanity.studio`) |

---

## Deploy en Cloudflare Pages

### Primera vez

1. Subir el repo a GitHub
2. Entrar a [pages.cloudflare.com](https://pages.cloudflare.com) → "Create a project" → "Connect to Git"
3. Seleccionar el repo y configurar:

| Setting | Valor |
| :--- | :--- |
| Root directory | `cas-astro-sanity` (o como se llame la carpeta del sitio, NO `studio/`) |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node.js version | `22` |

4. En "Environment variables" agregar `PUBLIC_SANITY_PROJECT_ID`, `PUBLIC_SANITY_DATASET` y las variables de Mailjet, tanto en **Production** como en **Preview**
5. Deploy

Cloudflare asigna un dominio `.pages.dev` automáticamente. El dominio propio se vincula desde Settings → Custom Domains.

### Deploys siguientes

Cada push a la rama de producción dispara un deploy automático a producción; cualquier otra rama genera un **deployment de preview** con su propia URL, sin afectar producción. También se puede hacer deploy manual desde el panel o vía CLI con `wrangler pages deploy dist`.

### Si se decide migrar a Vercel

1. Entrar a [vercel.com](https://vercel.com) → "Add New Project" → importar el mismo repo
2. Misma configuración de build
3. Agregar las mismas variables de entorno
4. El archivo `api/contact.js` en la raíz actúa como Vercel Serverless Function automáticamente

No hay que cambiar ningún archivo del proyecto — ambas plataformas están soportadas.

---

## Design system

Definido en [`src/styles/global.css`](src/styles/global.css).

- **Tipografías:** Space Grotesk + Plus Jakarta Sans + Inter (Google Fonts, carga no bloqueante)
- **Paleta:** dark mode por defecto, naranja `#F69220` como color primario
- **Modo dark:** activado con clase `dark` en el `<html>` (siempre activo)
