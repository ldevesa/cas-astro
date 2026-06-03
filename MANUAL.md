# Manual de operación — Sitio CAS

Manual paso a paso para administrar, actualizar y mantener el sitio de CAS (`contenidosad.com`).

Este documento está pensado para uso operativo. Para detalles técnicos de arquitectura, ver [README.md](README.md).

---

## Índice

1. [Arquitectura general](#1-arquitectura-general)
2. [Cuentas y accesos necesarios](#2-cuentas-y-accesos-necesarios)
3. [Instalación local (primera vez)](#3-instalación-local-primera-vez)
4. [Trabajar con GitHub](#4-trabajar-con-github)
5. [Cloudflare Pages](#5-cloudflare-pages)
6. [WordPress como CMS](#6-wordpress-como-cms)
7. [Actualizar contenido del sitio](#7-actualizar-contenido-del-sitio)
8. [Actualizar elementos visuales](#8-actualizar-elementos-visuales)
9. [Actualizaciones de software](#9-actualizaciones-de-software)
10. [Troubleshooting](#10-troubleshooting)
11. [Variables de entorno](#11-variables-de-entorno)

---

## 1. Arquitectura general

El sitio funciona con **tres piezas conectadas**:

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   WordPress     │      │   GitHub        │      │  Cloudflare     │
│  (contenido)    │      │  (código)       │      │  Pages (front)  │
│                 │      │                 │      │                 │
│ contenidosad.com│      │ ldevesa/        │      │ contenidosad.com│
│ contentad.net   │      │ cas-astro       │      │                 │
└────────┬────────┘      └────────┬────────┘      └────────▲────────┘
         │                        │                        │
         │  REST API              │  push triggers         │
         └────────────────────────┼────────────────────────┘
                                  │
                            durante el build
```

### Resumen del flujo

- **WordPress** guarda los casos, clientes, carreras (contenido editable).
- **GitHub** guarda el código del sitio (HTML/CSS/JS/Astro).
- **Cloudflare Pages** corre `npm run build`, que toma el código de GitHub + datos de WordPress, y genera HTML estático servido por CDN.

### Importante: el sitio es **estático (SSG)**

Cada vez que cambia algo (código en GitHub o contenido en WordPress), hay que **regenerar el sitio** (rebuild). Cloudflare lo hace automáticamente con cada `git push`, pero para cambios solo en WordPress hay que dispararlo manualmente o vía webhook.

---

## 2. Cuentas y accesos necesarios

| Servicio | Para qué | URL |
| :--- | :--- | :--- |
| **GitHub** | Código del sitio | https://github.com/ldevesa/cas-astro |
| **Cloudflare Pages** | Hosting + deploys | https://dash.cloudflare.com → Workers & Pages |
| **WordPress ES/PT** | CMS principal (casos, clientes, oficinas) | https://contenidosad.com/wp-admin |
| **WordPress EN** | CMS para versión en inglés | https://contentad.net/wp-admin |
| **Mailjet** | Envío de emails del formulario | https://app.mailjet.com |
| **Dominio** | Registro del dominio `contenidosad.com` | Donde esté registrado el dominio |

Asegurate de tener usuario y contraseña de cada uno antes de operar.

---

## 3. Instalación local (primera vez)

Solo necesario si vas a editar código localmente. Para cambios solo de contenido, no hace falta.

### Requisitos previos

| Herramienta | Versión | Dónde descargarla |
| :--- | :--- | :--- |
| **Node.js** | 22 o superior | https://nodejs.org |
| **Git** | Última | https://git-scm.com |
| **Editor de código** | VS Code recomendado | https://code.visualstudio.com |

### Pasos

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/ldevesa/cas-astro.git
   cd cas-astro/cas-astro
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```
   Esto descarga todas las librerías que usa el proyecto (tarda 2-5 min la primera vez).

3. **Configurar variables de entorno locales:**
   ```bash
   cp .env.example .env
   ```
   Abrí el archivo `.env` y completá los valores. Ver sección [Variables de entorno](#11-variables-de-entorno).

4. **Levantar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```
   Abrí en el navegador: http://localhost:4321

5. **Hacer cambios** — cualquier edición se refleja instantáneamente en el navegador.

### Comandos útiles

| Comando | Qué hace |
| :--- | :--- |
| `npm run dev` | Servidor de desarrollo en `localhost:4321` |
| `npm run build` | Genera el sitio estático en `./dist/` |
| `npm run preview` | Previsualiza el build localmente |

---

## 4. Trabajar con GitHub

### Hacer un cambio chico (texto, imagen)

```bash
# 1. Asegurarse de estar actualizado
git pull

# 2. Hacer los cambios en el editor

# 3. Ver qué cambió
git status

# 4. Agregar y commitear
git add .
git commit -m "descripción del cambio"

# 5. Subir a GitHub
git push
```

Cloudflare detecta el push automáticamente y rebuildea el sitio.

### Buenas prácticas de commits

- Un commit por cambio lógico (no mezclar "cambié texto del hero" con "actualicé el form").
- Mensajes en presente y descriptivos: `cambio texto del Hero`, no `cambios`.
- Hacer `git pull` **antes** de empezar a trabajar para evitar conflictos.

### Si algo sale mal después de un commit

Volver al estado anterior (revertir el último commit publicado):

```bash
git revert HEAD
git push
```

Esto crea un commit que deshace el anterior. Cloudflare rebuildea con el estado revertido.

---

## 5. Cloudflare Pages

### Dónde está el panel

https://dash.cloudflare.com → **Workers & Pages** → seleccionar el proyecto `cas-astro` (o como esté nombrado).

### Cómo redeployar manualmente

Útil cuando agregás un caso/cliente en WordPress y querés que aparezca en el sitio:

1. Dashboard → Workers & Pages → tu proyecto
2. Pestaña **Deployments**
3. En el último deployment hacer click en el menú "..." → **"Retry deployment"** (o "Reintentar implementación")
4. Esperar 1-2 minutos
5. Refrescar el sitio público

### Ver logs de un deploy

Si un deploy falla:

1. Dashboard → Deployments → click en el deployment que falló
2. Pestaña **"View logs"** o **"Build log"**
3. Buscar líneas en rojo o que digan `error`

Errores típicos:
- `WP API error: 500` → WordPress está caído o tiene un error.
- `WP API error: rest_no_route` → falta un CPT o se cambió el slug.
- Errores de TypeScript / sintaxis → algo está mal en el código.

### Variables de entorno en Cloudflare

1. Dashboard → tu proyecto → **Settings** → **Environment variables**
2. Agregar/editar las variables (ver sección [Variables de entorno](#11-variables-de-entorno))
3. **Importante:** después de editar, hay que hacer un deploy nuevo para que tomen efecto.

### Configurar Deploy Hook (para que WordPress dispare rebuilds)

1. Dashboard → tu proyecto → **Settings** → **Builds & deployments** → **Deploy hooks**
2. Click en **"Add deploy hook"**
3. Nombre: `WordPress publish` (o el que quieras)
4. Branch: `main`
5. Copiar la URL que genera (algo como `https://api.cloudflare.com/...`)
6. En WordPress: instalar plugin **"WP Webhooks"** → configurar esa URL como destino cuando se publique o actualice un post.

Resultado: cada vez que se publica un caso en WordPress, el sitio se actualiza solo en 1-2 minutos.

---

## 6. WordPress como CMS

Hay **dos sitios WordPress** independientes:

| Sitio | Idiomas | Admin |
| :--- | :--- | :--- |
| `contenidosad.com` | Español + Portugués (con Polylang) | https://contenidosad.com/wp-admin |
| `contentad.net` | Inglés | https://contentad.net/wp-admin |

### Tipos de contenido que consume el sitio

| CPT en WordPress | Dónde aparece en el sitio |
| :--- | :--- |
| **Casos** (`casos`) | `/casos`, `/casos/[slug]` |
| **Clientes** (`clientes`) | Carrusel de clientes en home |
| **Carreras** (`carreras`) | `/carreras`, `/carreras/[slug]` |

### Agregar un caso nuevo

1. Entrar a https://contenidosad.com/wp-admin
2. Menú lateral → **Casos** → **Añadir nuevo**
3. Completar:
   - **Título** del caso
   - **Extracto** (resumen corto que aparece en el listado)
   - **Contenido** (descripción larga del caso)
   - **Imagen destacada** (aparece en el listado y como portada)
4. **Campos ACF** (panel inferior):
   - **Resumen**: texto corto para mostrar
   - **Subtítulo**: bajada del caso
   - **Mercados**: país/región donde se aplicó
   - **Título mercado**: label del mercado
   - **Post campaña**: código embed de YouTube (iframe completo)
   - **Image carousel**: imágenes del galería (clickear "Add row" por cada imagen)
5. **Idioma** (panel derecho, Polylang): elegir si es ES o PT
6. **Publicar**
7. (Si tenés Deploy Hook configurado) → el sitio se actualiza solo en 1-2 min.
   **(Si no)** → ir a Cloudflare Pages → "Reintentar implementación"

### Caso en portugués

Mismo proceso, pero al elegir el idioma poner "Portugués". Si querés que sea la traducción del mismo caso en español:
1. Editar el caso en español
2. Panel "Languages" → al lado de Portugués click en el "+"
3. Completar los campos traducidos
4. Publicar

### Caso en inglés

Va en el **otro WordPress** (`contentad.net`):
1. Entrar a https://contentad.net/wp-admin
2. Mismo proceso de carga (sin Polylang porque es solo inglés)

### Agregar un cliente

1. Admin → **Clientes** → **Añadir nuevo**
2. **Título**: nombre del cliente
3. **Imagen destacada**: logo del cliente (PNG con fondo transparente recomendado, ~200×100px)
4. Publicar
5. Redeployar (ver arriba)

### Agregar una búsqueda laboral (carrera)

1. Admin → **Carreras** → **Añadir nuevo**
2. **Título**: nombre del puesto
3. **Contenido**: descripción del puesto
4. **Campos ACF**:
   - **Tipo**: ej "Full-time", "Part-time"
   - **Área de trabajo**: ej "Marketing"
   - **Categoría**: ej "Senior"
   - **Fecha**: fecha de publicación
5. Publicar
6. Redeployar

### Editar oficinas, redes sociales, datos generales

Estos datos están **hardcodeados en el código**, no en WordPress. Ver [src/lib/wp.ts:109-124](src/lib/wp.ts#L109-L124).

Para editarlos:
1. Abrir [src/lib/wp.ts](src/lib/wp.ts)
2. Editar el array `offices` o `socialLinks` dentro de `getStaticSiteData()`
3. Commit + push

---

## 7. Actualizar contenido del sitio

### Flujo completo

```
Cambio en WordPress      →   Sitio NO actualizado (sigue viejo)
        ↓
Redeploy en Cloudflare   →   Sitio actualizado (1-2 min)
```

### Métodos para disparar el redeploy

| Método | Cuándo conviene | Pasos |
| :--- | :--- | :--- |
| **Manual** | Cambios puntuales | Cloudflare → Deployments → "Reintentar implementación" |
| **Deploy Hook** | Edición frecuente | Configurar una vez (ver sección 5), después se dispara solo desde WP |
| **Commit vacío** | Desde la terminal | `git commit --allow-empty -m "rebuild" && git push` |

### Cuándo necesitás redeployar

| Acción | ¿Redeploy? |
| :--- | :--- |
| Agregar/editar caso en WordPress | Sí |
| Agregar/editar cliente en WordPress | Sí |
| Agregar/editar carrera en WordPress | Sí |
| Cambiar contenido del WordPress que ya está publicado | Sí |
| Cambiar imagen destacada de un caso | Sí |
| Cambiar texto en `index.astro` u otro archivo | Solo `git push` (Cloudflare rebuildea solo) |
| Cambiar variable de entorno en Cloudflare | Sí |
| Solo navegar el sitio | No |

---

## 8. Actualizar elementos visuales

### Cambiar textos del sitio

Los textos que **NO vienen de WordPress** están en los archivos `.astro` de [src/pages/](src/pages/).

Ejemplos:
- Hero principal (home): [src/pages/index.astro](src/pages/index.astro)
- Página "Qué hacemos": [src/pages/que-hacemos.astro](src/pages/que-hacemos.astro)
- Página de contacto: [src/pages/contacto.astro](src/pages/contacto.astro)

Para textos del **nav y footer** (multiidioma): [src/i18n/ui.ts](src/i18n/ui.ts)

**Flujo:** editar archivo → `git add .` → `git commit -m "..."` → `git push` → Cloudflare rebuildea solo.

### Cambiar el video del Hero (efecto ASCII)

El video está en [public/Video.mp4](public/Video.mp4) y se referencia en [src/components/HeroShader.astro:52](src/components/HeroShader.astro#L52).

**Opción A — Mismo nombre (rápido):**
1. Reemplazar `public/Video.mp4` con el video nuevo (mismo nombre exacto)
2. `git add . && git commit -m "nuevo video hero" && git push`
3. **Importante:** purgar caché de Cloudflare para que los visitantes vean el nuevo (Dashboard → Caching → "Purge everything")

**Opción B — Nombre nuevo (recomendado):**
1. Subir el nuevo a `public/` con otro nombre, ej: `public/Video-2026.mp4`
2. Editar [HeroShader.astro:52](src/components/HeroShader.astro#L52):
   ```ts
   video.src = '/Video-2026.mp4';
   ```
3. Commit + push

**Recomendaciones del video:**
- Formato: MP4 (h.264)
- Resolución: 1280×720 o 1920×1080 (más alta no aporta porque el shader baja a puntos)
- Duración: 5-15 segundos (está en loop)
- Peso: idealmente menos de 5-10 MB (comprimir con Handbrake o ffmpeg)
- Audio: se silencia automáticamente
- Color: irrelevante, el shader lo pasa a naranja

### Cambiar imágenes generales

Las imágenes estáticas (no las de casos/clientes) están en [public/img/](public/img/).

Para reemplazar:
1. Copiar la imagen nueva a `public/img/` (preferir mismo formato)
2. Si mantenés el nombre: por el cache de 1 año, hay que purgar caché en Cloudflare
3. **Recomendado:** usar nombre nuevo y actualizar la referencia en el archivo `.astro` correspondiente

### Cambiar el logo

1. Reemplazar `public/img/logo-cas.svg` (o el archivo correspondiente)
2. Commit + push

### Cambiar paleta de colores o tipografías

Definido en [src/styles/global.css](src/styles/global.css):
- Variables CSS para colores
- Imports de Google Fonts arriba

Cambios acá afectan todo el sitio.

### Cambiar ciudades del globo 3D

Editar [public/assets/globo/globo-data.js](public/assets/globo/globo-data.js):

```js
{ city: "Buenos Aires", country: "Argentina", lat: -34.6, lng: -58.38 }
```

Agregar/quitar objetos según necesidad. Los "centros de negocio" (puntos destacados) se configuran en [public/assets/globo/globo.js](public/assets/globo/globo.js).

---

## 9. Actualizaciones de software

### Actualizar plugins de WordPress

**Antes de actualizar:**
- Tener backup reciente del WP (algunos hostings lo hacen automático).
- Tener identificado qué plugins son críticos para el sitio: **ACF** y **Polylang/WPML** (estos NO se pueden tocar sin testear).

**Flujo seguro:**

1. **Actualizar el plugin** en WordPress Admin.
2. **NO redeployar todavía.** El sitio público sigue funcionando con datos viejos sin problema.
3. **Verificar que la API REST devuelve datos válidos**, abriendo estas URLs en el navegador:
   ```
   https://contenidosad.com/wp-json/wp/v2/casos?_embed
   https://contenidosad.com/wp-json/wp/v2/clientes?_embed
   https://contenidosad.com/wp-json/wp/v2/carreras
   https://contentad.net/wp-json/wp/v2/casos?_embed
   ```
4. **Validar visualmente:**
   - ¿Devuelven un array `[ {...}, {...} ]` con casos?
   - ¿Cada caso tiene un objeto `acf` con `resumen`, `subtitulo`, etc?
   - ¿No hay error 500 ni `rest_no_route`?
5. **Si está todo OK** → redeployar en Cloudflare.
6. **Si algo se rompió** → NO redeployar. Volver el plugin a la versión anterior o investigar antes.

### Actualizar dependencias del proyecto (npm)

Solo si tenés el proyecto localmente. **No suele ser necesario** salvo por updates de seguridad.

```bash
# Ver dependencias desactualizadas
npm outdated

# Actualizar todas a la última versión menor (más seguro)
npm update

# Actualizar Astro a la última versión mayor (cuidado, puede romper)
npm install astro@latest
```

Después de cualquier update:
1. `npm run build` localmente para verificar que compila
2. `npm run dev` para verificar visualmente
3. Si está todo OK → commit + push

### Actualizar Node.js

Cloudflare Pages usa la versión definida en Settings → Environment variables → `NODE_VERSION` (actualmente `22`).

Si necesitás cambiar:
1. Cloudflare Pages → Settings → Environment variables → editar `NODE_VERSION`
2. Actualizar también el campo `engines.node` en [package.json](package.json#L5-L7)
3. Commit + push

---

## 10. Troubleshooting

### El sitio no muestra cambios después de editar en WordPress

**Causa:** no se hizo redeploy.
**Solución:** Cloudflare → Deployments → "Reintentar implementación".

### El sitio no muestra cambios después de un `git push`

**Causa 1:** El deploy falló.
**Solución:** Cloudflare → Deployments → ver el deploy fallido → revisar logs.

**Causa 2:** Caché del navegador.
**Solución:** Ctrl+F5 (refresh forzado) o probar en modo incógnito.

**Causa 3:** Caché del CDN.
**Solución:** Cloudflare → Caching → "Purge everything".

### El deploy falla con `WP API error: 500`

**Causa:** WordPress está caído o tiene un error.
**Solución:**
1. Verificar que `https://contenidosad.com/wp-admin` cargue.
2. Verificar que `https://contenidosad.com/wp-json/wp/v2/casos?_embed` devuelva JSON.
3. Si WP está caído: contactar al hosting de WP.
4. Si WP funciona pero la API falla: revisar si se desactivó algún plugin (ACF, Polylang).

### El deploy falla con `WP API error: rest_no_route`

**Causa:** el endpoint no existe en WordPress.
**Solución:**
1. Verificar que el CPT (`casos`, `clientes`, `carreras`) sigue registrado en WordPress.
2. Verificar que tiene `show_in_rest: true` en su registro.
3. Si se cambió el slug del CPT, hay que actualizar también [src/lib/wp.ts](src/lib/wp.ts).

### Los casos aparecen sin imagen / sin acf

**Causa:** ACF no está activo o no se completaron los campos en WP.
**Solución:** Activar ACF en WordPress y revisar los campos del caso.

### El formulario de contacto no envía emails

**Causa 1:** variables de entorno mal configuradas.
**Solución:** Cloudflare → Settings → Environment variables → verificar `MJ_APIKEY_PUBLIC`, `MJ_APIKEY_PRIVATE`, `CONTACT_*`.

**Causa 2:** API de Mailjet caída o sin saldo.
**Solución:** Verificar en https://app.mailjet.com el estado de la cuenta.

**Causa 3:** Después de editar las env vars, no se redeployó.
**Solución:** Redeployar.

### El sitio en inglés no muestra casos

**Causa:** problema con `contentad.net` (el WordPress en inglés).
**Solución:** Verificar `https://contentad.net/wp-json/wp/v2/casos?_embed`.

### Cambié el video del Hero y sigue viéndose el viejo

**Causa:** caché de 1 año en archivos del `public/` (configurado en [public/_headers](public/_headers)).
**Solución:** Cloudflare → Caching → "Purge everything", o usar un nombre distinto para el video nuevo.

---

## 11. Variables de entorno

Las variables se configuran **en dos lugares**:

| Entorno | Dónde |
| :--- | :--- |
| **Local** | Archivo `.env` (no se sube a git) |
| **Producción** | Cloudflare Pages → Settings → Environment variables |

### Variables actuales

| Variable | Tipo | Para qué |
| :--- | :--- | :--- |
| `PUBLIC_WP_URL` | URL | URL del WordPress principal (ES/PT) |
| `PUBLIC_WP_URL_EN` | URL | URL del WordPress en inglés |
| `MJ_APIKEY_PUBLIC` | string | API key pública de Mailjet |
| `MJ_APIKEY_PRIVATE` | string | API key privada de Mailjet |
| `CONTACT_FROM_EMAIL` | email | Remitente del email del form |
| `CONTACT_FROM_NAME` | string | Nombre del remitente |
| `CONTACT_TO` | emails (csv) | Destinatarios principales |
| `CONTACT_BCC` | emails (csv) | Destinatarios en copia oculta |

### Ejemplo de `.env` local

```env
PUBLIC_WP_URL=https://contenidosad.com
PUBLIC_WP_URL_EN=https://contentad.net
MJ_APIKEY_PUBLIC=tu_api_key_aqui
MJ_APIKEY_PRIVATE=tu_api_secret_aqui
CONTACT_FROM_EMAIL=info@contenidosad.com
CONTACT_FROM_NAME=CAS
CONTACT_TO=mail1@empresa.com,mail2@empresa.com
CONTACT_BCC=copia@empresa.com
```

### Cómo obtener las API keys de Mailjet

1. Entrar a https://app.mailjet.com
2. Cuenta (esquina superior derecha) → **API Keys**
3. Copiar **API Key** y **Secret Key**

### Importante

- `PUBLIC_*` → estas variables están disponibles tanto en el server como en el cliente. **No poner secretos acá.**
- `MJ_*`, `CONTACT_*` → solo accesibles en la función serverless. Seguro para keys privadas.
- **Después de editar variables en Cloudflare, hay que redeployar** para que tomen efecto.

---

## Glosario rápido

| Término | Significado |
| :--- | :--- |
| **SSG** | Static Site Generation. El sitio se genera en HTML estático y se sirve desde CDN. |
| **SSR** | Server-Side Rendering. El sitio se genera en cada request (no es lo que usamos). |
| **CDN** | Red de servidores globales que sirven los archivos cerca del usuario. |
| **CPT** | Custom Post Type. Tipo de contenido custom en WordPress (ej: `casos`, `clientes`). |
| **ACF** | Advanced Custom Fields. Plugin de WordPress para campos personalizados. |
| **Build** | Proceso que convierte el código fuente en HTML estático listo para servir. |
| **Deploy** | Subir el build al hosting (Cloudflare) para que sea accesible. |
| **Rebuild** | Volver a generar el build (se necesita cuando cambia código o contenido WP). |
| **Webhook** | URL que se llama automáticamente cuando ocurre un evento (ej: publicar en WP). |
| **REST API** | Interfaz que WordPress expone para consumir su contenido desde otros sistemas. |

---

## Contacto y soporte

Para dudas técnicas que no cubre este manual, consultar:

- [README.md](README.md) — documentación técnica detallada
- Documentación de Astro: https://docs.astro.build
- Documentación de Cloudflare Pages: https://developers.cloudflare.com/pages
- Documentación de WordPress REST API: https://developer.wordpress.org/rest-api
