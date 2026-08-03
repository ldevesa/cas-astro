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
6. [Sanity como CMS](#6-sanity-como-cms)
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
│   Sanity        │      │   GitHub        │      │  Cloudflare     │
│  (contenido)    │      │  (código)       │      │  Pages (front)  │
│                 │      │                 │      │                 │
│ Studio + dataset│      │ ldevesa/        │      │ contenidosad.com│
│ "production"    │      │ cas-astro       │      │                 │
└────────┬────────┘      └────────┬────────┘      └────────▲────────┘
         │                        │                        │
         │  GROQ (API)            │  push triggers         │
         └────────────────────────┼────────────────────────┘
                                  │
                            durante el build
```

### Resumen del flujo

- **Sanity** guarda los casos, clientes, carreras (contenido editable), con campos localizados ES/PT/EN dentro de un mismo documento.
- **GitHub** guarda el código del sitio (HTML/CSS/JS/Astro) y también el código del Sanity Studio (carpeta `studio/`).
- **Cloudflare Pages** corre `npm run build`, que toma el código de GitHub + datos de Sanity, y genera HTML estático servido por CDN.

### Importante: el sitio es **estático (SSG)**

Cada vez que cambia algo (código en GitHub o contenido en Sanity), hay que **regenerar el sitio** (rebuild). Cloudflare lo hace automáticamente con cada `git push`, pero para cambios solo en Sanity hay que dispararlo manualmente o vía webhook.

---

## 2. Cuentas y accesos necesarios

| Servicio | Para qué | URL |
| :--- | :--- | :--- |
| **GitHub** | Código del sitio y del Studio | https://github.com/ldevesa/cas-astro |
| **Cloudflare Pages** | Hosting + deploys | https://dash.cloudflare.com → Workers & Pages |
| **Sanity** | CMS (casos, clientes, carreras) y gestión del proyecto | https://sanity.io/manage (proyecto `cas-sitio`, org TDT) |
| **Sanity Studio** | Editar contenido | https://cas-sitio.sanity.studio (deployado — no hace falta correr nada local) |
| **Mailjet** | Envío de emails del formulario (principal) | https://app.mailjet.com |
| **Resend** | Envío de emails del formulario (fallback) | https://resend.com |
| **Dominio** | Registro del dominio `contenidosad.com` | Donde esté registrado el dominio |

Asegurate de tener usuario y contraseña de cada uno antes de operar.

---

## 3. Instalación local (primera vez)

Solo necesario si vas a editar código localmente. Para cambios solo de contenido, alcanza con correr el Studio (ver sección 6).

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
   cd cas-astro/cas-astro-sanity
   ```

2. **Instalar dependencias del sitio:**
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

### Comandos útiles (sitio)

| Comando | Qué hace |
| :--- | :--- |
| `npm run dev` | Servidor de desarrollo en `localhost:4321` |
| `npm run build` | Genera el sitio estático en `./dist/` |
| `npm run preview` | Previsualiza el build localmente |

### Comandos útiles (Studio, desde `studio/`)

| Comando | Qué hace |
| :--- | :--- |
| `npm install` | Instala dependencias del Studio (primera vez) |
| `npm run dev` | Abre el editor de contenido en `localhost:3333` |
| `npm run deploy` | Publica el Studio en una URL pública (`<proyecto>.sanity.studio`) |

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

Útil cuando agregás un caso/cliente en Sanity y querés que aparezca en el sitio:

1. Dashboard → Workers & Pages → tu proyecto
2. Pestaña **Deployments**
3. En el último deployment hacer click en el menú "..." → **"Retry deployment"** (o "Reintentar implementación")
4. Esperar 1-2 minutos
5. Refrescar el sitio público

**Ojo:** si acabás de agregar o cambiar variables de entorno, "Retry" a veces no las relee. Si el redeploy sigue fallando con el mismo error después de corregir las variables, forzá un deployment nuevo en vez de reintentar el viejo (ver [Troubleshooting](#10-troubleshooting) o el método "Commit vacío" en la sección 7).

### Ver logs de un deploy

Si un deploy falla:

1. Dashboard → Deployments → click en el deployment que falló
2. Pestaña **"View logs"** o **"Build log"**
3. Buscar líneas en rojo o que digan `error`

Errores típicos:
- `Configuration must contain projectId` → faltan `PUBLIC_SANITY_PROJECT_ID` / `PUBLIC_SANITY_DATASET` en las variables de entorno del deployment (ver más abajo).
- Errores de TypeScript / sintaxis → algo está mal en el código.

### Variables de entorno en Cloudflare

Cloudflare Pages separa las variables en **dos scopes independientes: Production y Preview**. Configurarlas en uno no las aplica al otro.

1. Dashboard → tu proyecto → **Settings** → **Environment variables**
2. Agregar/editar las variables **en el scope que corresponda** (ver sección [Variables de entorno](#11-variables-de-entorno)):
   - **Production** → deployments de la rama principal (el sitio real).
   - **Preview** → deployments de cualquier otra rama (branches de prueba, como una migración en curso).
3. **Importante:** después de editar, hay que hacer un deploy nuevo para que tomen efecto — y si el deployment falló antes de corregir las variables, un simple "Retry" puede no alcanzar (ver arriba).

### Configurar Deploy Hook (para que Sanity dispare rebuilds)

**Ya está armado y probado**, apuntando hoy a `sanity-migration` (ver [CUTOVER.md § 4](CUTOVER.md) para el detalle de qué falta ajustar antes de producción). Pasos para crear uno nuevo (por ejemplo, el de producción cuando llegue el momento):

1. Dashboard → tu proyecto → **Configuración** → **Desarrollo** (en el panel rediseñado de Cloudflare, esto ya NO está bajo "General" ni tiene la palabra "hook" a la vista — hay que buscarlo bajo "Desarrollo", el nombre en español de la sección de builds)
2. Scrollear hasta la sección **"Enlaces de implementación"** (es como Cloudflare tradujo "Deploy Hooks") → click en el **"+"**
3. Nombre: `Sanity publish` (o el que quieras)
4. Rama a compilar: `main` (la rama de producción) o `sanity-migration` (para preview)
5. Copiar la URL que genera (`https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/...`)
6. En Sanity: [sanity.io/manage](https://sanity.io/manage) → proyecto → **API** → **Webhooks** → "Create webhook" → dataset `production`, pegar esa URL como destino, trigger en Create/Update/Delete, filtro GROQ `_type in ["caso", "cliente", "carrera", "paginaHome"]` (ver detalle en sección 6).
7. Para confirmar que quedó bien: publicar cualquier cambio chico en el Studio y, en el webhook (sanity.io/manage → API → Webhooks → click en **"Edit webhook"** → el historial de intentos está más abajo en esa misma pantalla, o probar la pestaña **Activity** del proyecto si no aparece ahí), revisar el log de intentos — debería mostrar `"resultCode": 200` y un ID de deployment. Ese deployment se ve en la **URL alias de la rama** (`https://<rama>.cas-astro.pages.dev`, sin ningún hash adelante) — la URL con hash de un deployment puntual queda congelada para siempre y nunca muestra contenido nuevo.

**Importante:** el filtro GROQ solo dispara para los `_type` que están listados ahí. **Cada vez que se agregue un tipo de documento nuevo en `studio/schemaTypes/` hay que sumarlo al filtro** — si no, publicar cambios en ese tipo nuevo no va a disparar ningún rebuild, y va a parecer que "no anda" cuando en realidad el webhook ni se está ejecutando (se ve en que el historial de intentos no tiene ninguna entrada reciente).

Resultado: cada vez que se publica un documento en el Studio, el sitio se actualiza solo en 1-2 minutos.

### CORS: dominios autorizados a pedir assets de Sanity

Las **imágenes** de Sanity (`cdn.sanity.io/images/...`) se pueden usar en cualquier sitio sin configurar nada. Pero otro tipo de archivos — como el **video de fondo del Hero** (`cdn.sanity.io/files/...`) — sí exigen que el dominio que lo pide esté autorizado, **si el elemento HTML lo pide con `crossOrigin="anonymous"`** (el efecto del Hero lo necesita porque Three.js tiene que leer los píxeles del video). Sin esto, el navegador tira un error de CORS (`403 Forbidden`, `CORS Origin not allowed`) — aunque abrir la URL del video directo en el navegador, o probarla con `curl`, funcione perfecto (por eso es un error fácil de no detectar a simple vista).

Para agregar un dominio autorizado:

```bash
cd studio
npx sanity cors add https://tu-dominio.com --no-credentials
```

Dominios que ya están autorizados: `localhost:3333` (Studio local), `localhost:4321` (sitio local), `https://sanity-migration.cas-astro.pages.dev` (preview). **Falta agregar el dominio de producción antes del cutover** — ver [CUTOVER.md](CUTOVER.md).

Ver todos los dominios autorizados: `npx sanity cors list` (desde `studio/`).

---

## 6. Sanity como CMS

El contenido vive en **un solo proyecto de Sanity**, con **un solo dataset** (`production`) que incluye los 3 idiomas dentro de cada documento — a diferencia del esquema anterior con dos WordPress separados, acá no hay "otro sitio para inglés".

### Tipos de contenido (documentos)

| Documento en Sanity | Dónde aparece en el sitio |
| :--- | :--- |
| **Caso** (`caso`) | `/casos`, `/casos/[slug]` |
| **Cliente** (`cliente`) | Carrusel de clientes en home, `/clientes` |
| **Carrera** (`carrera`) | `/carreras`, `/carreras/[slug]` |

### Cómo abrir el Studio

**Publicado (recomendado, para el día a día):**

https://cas-sitio.sanity.studio — entrás directo, sin instalar nada ni tener el código. Necesitás estar logueado con una cuenta de Sanity con permisos en el proyecto.

Si en algún momento hay que redeployar el Studio (por ejemplo, después de agregar un campo nuevo en un schema):
```bash
cd studio
npm run deploy
```
(el hostname ya quedó guardado en `sanity.cli.ts`, no vuelve a preguntar nada)

**Local (para desarrollar/probar cambios de schema antes de deployarlos):**
```bash
cd studio
npm install   # solo la primera vez
npm run dev
```
Abrí `http://localhost:3333`.
Esto genera una URL tipo `https://cas-sitio.sanity.studio` accesible desde el navegador, sin instalar nada.

### Ver todas las imágenes y videos (equivalente a "Media" de WordPress)

El Studio tiene una pestaña **Media** en el menú lateral (plugin `sanity-plugin-media`) con una grilla de **todos** los archivos subidos al proyecto, sin importar en qué documento se usan:

- Buscador y filtros por tipo/tamaño.
- Click en cualquier archivo para ver su **URL**, dimensiones, peso y metadata.
- Muestra **en qué documentos está usado** cada archivo (algo que WordPress no ofrece) — útil antes de borrar una imagen, para saber si romperías algún caso o cliente.

No hace falta entrar a un caso puntual para encontrar una imagen — se puede buscar directamente ahí.

**No confundir con "Media Tag":** en el menú lateral de contenido (no el de arriba) aparece un tipo de documento llamado "Media Tag", que suele estar vacío ("No documents of this type") — es normal, es solo para **etiquetar/organizar** archivos en categorías, una función opcional que nunca se usó. No tiene nada que ver con dónde están las imágenes reales; esas están en la pestaña **Media** de arriba, descripta recién.

### Agregar un caso nuevo

1. Abrir el Studio → menú lateral → **Caso** → **+ Create**
2. **Título**: completar las 3 pestañas/campos de idioma (es / pt / en). Si falta un idioma, el sitio muestra automáticamente la versión en español como respaldo — no es obligatorio completar los 3 para publicar.
3. **Slug**: se genera solo a partir del título en español. Es el mismo para los 3 idiomas (así funciona el selector de idioma del sitio).
4. **Subtítulo**, **Resumen**, **Mercado**: igual que el título, un campo por idioma.
5. **Contenido**: el texto largo del caso, con formato (rich text) — también por idioma.
6. **Imagen destacada**: obligatoria, aparece en el listado y como portada del caso.
7. **Galería**: opcional, agregar imágenes con el botón "+".
8. **ID de video de YouTube**: opcional, solo el ID (lo que va después de `/embed/` en la URL de YouTube), no el link completo.
9. **Publish** (arriba a la derecha).
10. Redeployar el sitio para que se vea el cambio (ver sección 7).

### Agregar un cliente

1. Studio → **Cliente** → **+ Create**
2. **Nombre**: nombre del cliente (no se traduce, es igual en los 3 idiomas)
3. **Logo**: imagen del logo (PNG con fondo transparente recomendado, ~200×100px)
4. **Publish**
5. Redeployar (ver sección 7)

### Agregar una búsqueda laboral (carrera)

1. Studio → **Carrera** → **+ Create**
2. **Título**: por idioma
3. **Tipo**: Full Time / Part Time / Freelance (lista fija, no se traduce — el sitio ya traduce la etiqueta visible solo)
4. **Categoría**: Junior / Semi Senior / Senior (ídem)
5. **Área de trabajo**: por idioma
6. **Fecha de publicación**
7. **Descripción del puesto**: rich text, por idioma
8. **Publish**
9. Redeployar

### Editar oficinas, redes sociales, datos generales

Estos datos están **hardcodeados en el código**, no en Sanity (nunca vinieron de un CMS). Ver [src/lib/site-data.ts](src/lib/site-data.ts).

Para editarlos:
1. Abrir [src/lib/site-data.ts](src/lib/site-data.ts)
2. Editar el array `offices` o `socialLinks` dentro de `getStaticSiteData()`
3. Commit + push

---

## 7. Actualizar contenido del sitio

### Flujo completo

```
Cambio publicado en Sanity Studio   →   Sitio NO actualizado (sigue viejo)
        ↓
Redeploy en Cloudflare              →   Sitio actualizado (1-2 min)
```

### Métodos para disparar el redeploy

| Método | Cuándo conviene | Pasos |
| :--- | :--- | :--- |
| **Manual** | Cambios puntuales | Cloudflare → Deployments → "Reintentar implementación" |
| **Webhook de Sanity** | Edición frecuente | Configurar una vez (ver sección 5), después se dispara solo al publicar en el Studio |
| **Commit vacío** | Desde la terminal, o cuando "Retry" no relee variables nuevas | `git commit --allow-empty -m "rebuild" && git push` |

### Cuándo necesitás redeployar

| Acción | ¿Redeploy? |
| :--- | :--- |
| Publicar/editar un caso en el Studio | Sí |
| Publicar/editar un cliente en el Studio | Sí |
| Publicar/editar una carrera en el Studio | Sí |
| Cambiar imagen destacada de un caso | Sí |
| Cambiar texto en `index.astro` u otro archivo | Solo `git push` (Cloudflare rebuildea solo) |
| Cambiar variable de entorno en Cloudflare | Sí |
| Solo navegar el sitio | No |

---

## 8. Actualizar elementos visuales

### Cambiar textos del sitio

Los textos que **NO vienen de Sanity** están en los archivos `.astro` de [src/pages/](src/pages/).

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

Las imágenes estáticas (no las de casos/clientes, esas van por el Studio) están en [public/img/](public/img/).

Para reemplazar:
1. Copiar la imagen nueva a `public/img/` (preferir mismo formato)
2. Si mantenés el nombre: por el cache de 1 año, hay que purgar caché en Cloudflare
3. **Recomendado:** usar nombre nuevo y actualizar la referencia en el archivo `.astro` correspondiente

### Cambiar el logo

1. Reemplazar `public/img/logo-cas.svg` (o el archivo correspondiente)
2. Commit + push

### Cambiar el formulario de contacto (campos, texto del email, etc.)

**Importante:** la lógica del formulario está **duplicada a propósito** en dos archivos, uno por plataforma de hosting:

- [functions/api/contact.js](functions/api/contact.js) — formato Cloudflare Pages Functions. **Este es el que usa el sitio hoy.**
- [api/contact.js](api/contact.js) — formato Vercel Serverless Functions. No se usa mientras el hosting sea Cloudflare, queda listo por si algún día se migra a Vercel (ver [README.md](README.md#si-se-decide-migrar-a-vercel)).

Como no hay ningún mecanismo que los sincronice solo, **cualquier cambio en uno hay que replicarlo a mano en el otro** (agregar un campo, cambiar el asunto del email, cambiar validaciones, etc.) — si no, el día que se cambie de plataforma el formulario va a comportarse distinto a como lo dejaste.

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

### Actualizar schemas de Sanity (agregar/cambiar un campo)

Si hace falta un campo nuevo en Caso, Cliente o Carrera:

1. Editar el archivo correspondiente en `studio/schemaTypes/` (`caso.ts`, `cliente.ts`, `carrera.ts`)
2. Probar localmente: `cd studio && npm run dev`, verificar que el campo aparece bien en el editor
3. Commit + push del código del Studio
4. Correr `npm run deploy` desde `studio/` para que el cambio se vea en https://cas-sitio.sanity.studio
5. **No hace falta redeployar el sitio Astro solo por cambiar el schema** — hace falta si además se actualiza `src/lib/cms.ts` para usar ese campo nuevo en el sitio.

**Nunca borrar un campo que ya tiene datos cargados** sin antes migrar/vaciar ese contenido — puede romper documentos existentes. Ver el patrón de deprecación en la skill `sanity-best-practices` si hace falta.

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

El Studio (`studio/`) tiene su propio `package.json` independiente — actualizar sus dependencias por separado, desde `studio/`.

### Actualizar Node.js

Cloudflare Pages usa la versión definida en Settings → Environment variables → `NODE_VERSION` (actualmente `22`).

Si necesitás cambiar:
1. Cloudflare Pages → Settings → Environment variables → editar `NODE_VERSION`
2. Actualizar también el campo `engines.node` en [package.json](package.json#L5-L7)
3. Commit + push

---

## 10. Troubleshooting

### El sitio no muestra cambios después de editar en Sanity

**Causa:** no se hizo redeploy.
**Solución:** Cloudflare → Deployments → "Reintentar implementación".

### El sitio no muestra cambios después de un `git push`

**Causa 1:** El deploy falló.
**Solución:** Cloudflare → Deployments → ver el deploy fallido → revisar logs.

**Causa 2:** Caché del navegador.
**Solución:** Ctrl+F5 (refresh forzado) o probar en modo incógnito.

**Causa 3:** Caché del CDN.
**Solución:** Cloudflare → Caching → "Purge everything".

### El deploy falla con `Configuration must contain projectId`

**Causa:** faltan `PUBLIC_SANITY_PROJECT_ID` / `PUBLIC_SANITY_DATASET` en las variables de entorno de Cloudflare, **o están cargadas en el scope equivocado** (Production vs Preview — ver sección 5).
**Solución:**
1. Confirmar en qué rama corrió el deployment que falló (Production o Preview).
2. Cloudflare → Settings → Environment variables → agregar/mover las 2 variables al scope correcto.
3. Si "Retry deployment" vuelve a fallar con el mismo error, forzar un deployment nuevo (`git commit --allow-empty -m "rebuild" && git push`) en vez de reintentar el fallido — a veces Cloudflare no relee variables nuevas en un simple retry.

### Los casos aparecen sin imagen o sin texto en un idioma

**Causa 1:** el documento en Sanity no tiene ese campo/idioma completado. No es un error — `cms.ts` hace fallback a español automáticamente si falta una traducción, y la imagen destacada es un campo requerido en el schema, así que si falta, revisar el documento en el Studio.
**Causa 2:** el documento está guardado como **borrador** (draft) y no se publicó (falta el "Publish" en el Studio).

### El formulario de contacto no envía emails

Cada envío manda **2 emails independientes** — uno a `CONTACT_TO` (vendedores, sin UTMs) y otro a `CONTACT_TO_MARKETING` (con UTMs, opcional). Cada uno intenta **Mailjet primero y Resend como fallback automático** si Mailjet falla (ver `functions/api/contact.js`) — son independientes entre sí, así que uno puede fallar sin afectar al otro. El visitante solo ve "Error al enviar el mensaje" si **los dos** emails fallan del todo.

**Causa 1:** variables de entorno mal configuradas.
**Solución:** Cloudflare → Settings → Environment variables → verificar `MJ_APIKEY_PUBLIC`, `MJ_APIKEY_PRIVATE`, `CONTACT_*` (en el scope correcto, Production o Preview según corresponda).

**Causa 2:** API de Mailjet caída, cuenta bloqueada, o keys inválidas/expiradas. Si esto pasa, debería entrar en juego el fallback a Resend automáticamente (revisar los logs de la función, ver más abajo).
**Solución:** Verificar en https://app.mailjet.com → API → Request logs el estado de los envíos y de la cuenta.

**Causa 3:** El fallback a Resend tampoco funciona — falta `RESEND_API_KEY`, o `RESEND_FALLBACK_ENABLED=false`, o (el caso más común) modo sandbox de Resend — mientras no se verifique un dominio propio ahí, solo entrega al email con el que se creó esa cuenta.
**Solución:** Revisar los **Registros en tiempo real** de la función en Cloudflare (Implementaciones → deployment → Functions) — el código loguea `Mailjet error:` seguido de `Mailjet falló o no está configurado, reintentando con Resend.` y, si el fallback también falla, `Resend error:` con el motivo real de cada proveedor.

**Causa 4:** Después de editar las env vars, no se redeployó.
**Solución:** Redeployar.

### Cambié el video del Hero y sigue viéndose el viejo

**Causa:** caché de 1 año en archivos del `public/` (configurado en [public/_headers](public/_headers)).
**Solución:** Cloudflare → Caching → "Purge everything", o usar un nombre distinto para el video nuevo.

---

## 11. Variables de entorno

Las variables se configuran **en dos lugares**:

| Entorno | Dónde |
| :--- | :--- |
| **Local** | Archivo `.env` (no se sube a git) |
| **Producción / Preview** | Cloudflare Pages → Settings → Environment variables (scopes separados, ver sección 5) |

### Variables actuales

| Variable | Tipo | Para qué |
| :--- | :--- | :--- |
| `PUBLIC_SANITY_PROJECT_ID` | string | ID del proyecto de Sanity |
| `PUBLIC_SANITY_DATASET` | string | Dataset a consumir (`production`) |
| `MJ_APIKEY_PUBLIC` | string | API key pública de Mailjet (proveedor principal) |
| `MJ_APIKEY_PRIVATE` | string | API key privada de Mailjet (proveedor principal) |
| `RESEND_API_KEY` | string | API key de Resend (fallback, opcional) |
| `RESEND_FALLBACK_ENABLED` | string | `false` para desactivar el fallback a Resend sin borrar la key (default: activado si hay key cargada) |
| `CONTACT_FROM_EMAIL` | email | Remitente de Mailjet (`info@contenidosad.com`, ya verificado ahí) |
| `RESEND_FROM_EMAIL` | email | Remitente de Resend — `onboarding@resend.dev` hasta verificar un dominio propio ahí (Mailjet y Resend no comparten remitente, cada uno tiene el suyo verificado) |
| `CONTACT_FROM_NAME` | string | Nombre del remitente |
| `CONTACT_TO` | emails (csv) | Destinatarios "vendedores" — reciben el email **sin** datos de UTM/origen |
| `CONTACT_TO_MARKETING` | emails (csv) | Destinatarios "marketing" — reciben el email **con** datos de UTM/origen, para medir. Opcional: si no está, simplemente no se manda ese segundo email. Replica el "Mail 1 / Mail 2" que había en Contact Form 7 (WordPress) |
| `CONTACT_BCC` | emails (csv) | Copia oculta — solo aplica al email de marketing |

### Ejemplo de `.env` local

```env
PUBLIC_SANITY_PROJECT_ID=21wszpvy
PUBLIC_SANITY_DATASET=production
MJ_APIKEY_PUBLIC=tu_api_key_aqui
MJ_APIKEY_PRIVATE=tu_api_secret_aqui
CONTACT_FROM_EMAIL=info@contenidosad.com
RESEND_API_KEY=re_tu_api_key_aqui
RESEND_FROM_EMAIL=onboarding@resend.dev
CONTACT_FROM_NAME=CAS
CONTACT_TO=vendedor1@empresa.com,vendedor2@empresa.com
CONTACT_TO_MARKETING=marketing@empresa.com
CONTACT_BCC=copia@empresa.com
```

### Cómo obtener las API keys de Mailjet

1. Entrar a https://app.mailjet.com
2. Cuenta (esquina superior derecha) → **API Keys**
3. Copiar **API Key** y **Secret Key**

### Cómo obtener la API key de Resend

1. Entrar a https://resend.com/api-keys
2. **Create API Key** → copiar el valor (empieza con `re_`, solo se muestra una vez)

### Cómo verificar un dominio propio en Resend (para levantar el límite del modo sandbox del fallback)

1. https://resend.com/domains → **Add Domain** → `contenidosad.com`
2. Agregar los registros DNS (SPF/DKIM) que Resend indica, sin tocar nameservers ni el hosting actual
3. Una vez verificado, cambiar `RESEND_FROM_EMAIL` a una dirección de ese dominio en Cloudflare — hasta entonces, el remitente por default (`onboarding@resend.dev`) solo entrega al email con el que se creó la cuenta de Resend (esto solo afecta al fallback; el envío principal por Mailjet ya manda a cualquier destinatario sin esta restricción)

### Importante

- `PUBLIC_*` → estas variables están disponibles tanto en el server como en el cliente. **No poner secretos acá.**
- `RESEND_API_KEY`, `CONTACT_*` → solo accesibles en la función serverless. Seguro para keys privadas.
- **Después de editar variables en Cloudflare, hay que redeployar** para que tomen efecto — y hacerlo en el scope correcto (Production vs Preview, ver sección 5).
- El Studio (`studio/`) usa su **propio** archivo `.env` si hace falta un token de escritura (por ejemplo para scripts de migración) — ver `migration/.env.example`. Nunca compartir ese token, no es lo mismo que las variables `PUBLIC_*` del sitio.

---

## Glosario rápido

| Término | Significado |
| :--- | :--- |
| **SSG** | Static Site Generation. El sitio se genera en HTML estático y se sirve desde CDN. |
| **SSR** | Server-Side Rendering. El sitio se genera en cada request (no es lo que usamos). |
| **CDN** | Red de servidores globales que sirven los archivos cerca del usuario. |
| **Dataset** | El conjunto de documentos de un proyecto de Sanity (acá usamos uno solo: `production`). |
| **Documento** | Un registro editable en Sanity (un caso, un cliente, una carrera). |
| **Schema** | La definición de qué campos tiene cada tipo de documento, en `studio/schemaTypes/`. |
| **GROQ** | El lenguaje de consultas de Sanity, usado en `src/lib/cms.ts` para traer contenido. |
| **Portable Text** | El formato en el que Sanity guarda texto con formato (rich text), no HTML. |
| **Studio** | La interfaz de edición de contenido de Sanity (carpeta `studio/`). |
| **Build** | Proceso que convierte el código fuente en HTML estático listo para servir. |
| **Deploy** | Subir el build al hosting (Cloudflare) para que sea accesible. |
| **Rebuild** | Volver a generar el build (se necesita cuando cambia código o contenido de Sanity). |
| **Webhook** | URL que se llama automáticamente cuando ocurre un evento (ej: publicar en Sanity). |

---

## Contacto y soporte

Para dudas técnicas que no cubre este manual, consultar:

- [README.md](README.md) — documentación técnica detallada
- [CLAUDE.md](CLAUDE.md) — historial y decisiones de la migración de WordPress a Sanity
- [CUTOVER.md](CUTOVER.md) — checklist paso a paso para pasar `sanity-migration` a producción
- Documentación de Astro: https://docs.astro.build
- Documentación de Cloudflare Pages: https://developers.cloudflare.com/pages
- Documentación de Sanity: https://www.sanity.io/docs
