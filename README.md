# CAS — Contenidos Advertising | Sitio Web

Sitio web institucional de CAS construido con **Astro + Tailwind CSS**, conectado a **WordPress como CMS headless** vía REST API. Soporta tres idiomas (español, portugués, inglés) y se despliega como sitio 100% estático en Cloudflare Pages.

---

## Stack tecnológico

| Tecnología | Uso |
| :--- | :--- |
| [Astro 6](https://astro.build) | Framework principal, generación estática, View Transitions |
| [Tailwind CSS v4](https://tailwindcss.com) | Estilos utilitarios |
| [WordPress REST API](https://contenidosad.com/wp-json/) | CMS headless (casos, clientes, oficinas, redes) |
| [amCharts 5](https://www.amcharts.com) | Globo 3D y mapas de cobertura global |
| [Mailjet](https://www.mailjet.com) | Envío de emails del formulario de contacto |
| [Cloudflare Pages](https://pages.cloudflare.com) | Hosting + Functions (API serverless) |
| TypeScript | Tipado en capa de datos |

---

## Estructura del proyecto

```
cas-astro/
├── public/
│   ├── assets/
│   │   └── globo/
│   │       ├── globo.js        ← lógica del globo 3D y mapas (amCharts)
│   │       ├── globo-data.js   ← coordenadas de ciudades con presencia CAS
│   │       └── globo.css       ← estilos del contenedor del globo
│   ├── img/                    ← imágenes estáticas (logo, casos, íconos)
│   ├── video/                  ← videos de servicios
│   ├── Video.mp4               ← video del hero principal
│   ├── favicon-cas.png         ← favicon del sitio
│   ├── robots.txt              ← reglas para buscadores
│   └── _headers                ← headers HTTP (caché + seguridad) para Cloudflare Pages
├── functions/
│   └── api/
│       └── contact.js          ← función serverless (Cloudflare Pages Function)
│                                  maneja el POST del formulario de contacto
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
│   │   └── wp.ts               ← capa de datos: tipos TypeScript + fetch a WordPress API
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

Esto simplifica el routing y evita duplicar lógica de redirecciones.

### Cómo agregar o editar traducciones

Los strings de UI (navegación, footer, labels) están en [`src/i18n/ui.ts`](src/i18n/ui.ts).

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

### Cambio de idioma

El selector de idioma en el nav detecta automáticamente la URL actual y genera los links a la misma página en los otros idiomas. Esto está implementado en `getLangSwitcherPaths()` en [`src/i18n/utils.ts`](src/i18n/utils.ts).

---

## Formulario de contacto

El formulario usa **Mailjet** para el envío. No depende de WordPress ni de ningún servidor SMTP.

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

## Contenido desde WordPress

El sitio toma contenido de `contenidosad.com` en tiempo de **build** (no en runtime). Cada vez que se hace un deploy, Astro consulta la API y genera el HTML estático.

| Contenido | Endpoint |
| :--- | :--- |
| Casos (CPT) | `/wp-json/wp/v2/casos` |
| Clientes (CPT) | `/wp-json/wp/v2/clientes` |
| Datos del sitio (oficinas, redes) | configurados estáticamente en `wp.ts` |

Los casos usan campos ACF: `resumen`, `subtitulo`, `mercados`, `post_campana` (embed YouTube), `image_carousel`.

### Actualizar el sitio cuando se edita contenido en WordPress

Para que el sitio se actualice automáticamente cuando se publica o edita un caso en WordPress:

1. En Cloudflare Pages → Settings → Builds & Deployments → **Deploy Hooks**
2. Crear un hook (nombre sugerido: "WordPress publish") → copiar la URL generada
3. En WordPress instalar el plugin **WP Webhooks** (gratuito)
4. Configurar esa URL como destino cuando se publique o actualice un post

Resultado: editar un caso en WordPress → 1-2 minutos → el sitio se actualiza solo.

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

### Imágenes

Las imágenes en `public/img/` tienen cache de 1 año. Si se reemplaza una imagen, hay que **renombrar el archivo** para que los navegadores descarguen la versión nueva (o limpiar el caché de Cloudflare desde el panel).

Las imágenes procesadas por Astro (`<Image>` desde `src/assets/`) tienen hash automático y no tienen este problema.

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

Para producción, las variables se configuran en el panel de Cloudflare Pages (no en archivos subidos al repo).

---

## Comandos

Desde la carpeta `cas-astro/`:

| Comando | Acción |
| :--- | :--- |
| `npm install` | Instala dependencias |
| `npm run dev` | Dev server en `http://localhost:4321` |
| `npm run build` | Genera el sitio estático en `./dist/` |
| `npm run preview` | Preview local del build |

---

## Deploy en Cloudflare Pages

### Primera vez

1. Subir el repo a GitHub
2. Entrar a [pages.cloudflare.com](https://pages.cloudflare.com) → "Create a project" → "Connect to Git"
3. Seleccionar el repo y configurar:

| Setting | Valor |
| :--- | :--- |
| Root directory | `cas-astro` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node.js version | `22` |

4. En "Environment variables" agregar todas las variables listadas en la sección de formulario de contacto
5. Deploy

Cloudflare asigna un dominio `.pages.dev` automáticamente. El dominio propio se vincula desde Settings → Custom Domains.

### Deploys siguientes

Cada push a la rama principal dispara un deploy automático. También se puede hacer deploy manual desde el panel o vía CLI con `wrangler pages deploy dist`.

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
