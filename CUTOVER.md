# Checklist: pasar a producción en la cuenta nueva

Pasos para terminar de cortar de WordPress a Sanity en el sitio real (`contenidosad.com`), ejecutando en la **cuenta nueva** de Cloudflare/Sanity. No son automáticos — se ejecutan a mano, en orden.

Contexto de la migración: ver [CLAUDE.md](CLAUDE.md).

## 0. Estado actual (31/07)

- [x] **Sanity transferido a la organización TDT** (31/07) — se usó "Transfer ownership" (sanity.io/manage → proyecto `21wszpvy` → Settings → Danger zone), así que sigue siendo el mismo proyecto (`21wszpvy`), mismo dataset (`production`), mismo contenido migrado (99 documentos). No hizo falta re-migrar nada ni tocar `PUBLIC_SANITY_PROJECT_ID` en Cloudflare.
  - **Gotcha real que nos pasó:** "Transfer ownership" exige rol **Administrator a nivel organización** en el destino (no alcanza con ser Administrator a nivel *proyecto*, que es un rol distinto y más limitado). Sistemas había armado la organización TDT con un proyecto vacío (`CAS`, ID `7dj9txnd`) como si fuera el destino de la migración, pero el usuario solo tenía rol "Member" a nivel organización ahí — hubo que pedirle a Sistemas (login `tools@tdtglobal.io`, el único Administrator de organización) que le subiera el rol antes de poder completar la transferencia. **Ojo:** el rol se sube desde `sanity.io/organizations/<org-id>/members` (organización), no desde la pantalla de "Project members" del proyecto — son 2 pantallas distintas y fácil confundirlas.
  - El proyecto vacío `CAS` (`7dj9txnd`) que se había creado como receptáculo quedó sin uso — borrado (31/07).
  - El proyecto real (`21wszpvy`) se renombró de `cas-sanity` a **`cas-sitio`** (31/07), para mantener consistencia con `cas-sitio.pages.dev` y `cas-sitio.sanity.studio`. Es solo la etiqueta visual del proyecto — no afecta `projectId`, dataset, ni nada configurado en Cloudflare.
- [x] **Código sincronizado a `main`** (31/07, commit `bc01946`) — incluye todo lo que se había probado en `sanity-migration`: integración completa con Sanity, formulario de contacto con Resend + fallback automático a Mailjet, y el page builder de la Home (bloque Hero con fuente de video incrustado/Vimeo/YouTube).
- [ ] **Cloudflare Pages todavía no conectado en la cuenta nueva** — hay que crear el proyecto desde cero ahí (paso 1 de abajo). El proyecto viejo (`cas-astro` en la cuenta actual, `cas-astro.pages.dev` / `sanity-migration.cas-astro.pages.dev`) sigue funcionando en paralelo mientras tanto — no hay apuro en tocarlo.
- [ ] **`contenidosad.com` todavía no está conectado a ningún Cloudflare** (ni el viejo ni el nuevo) — sigue sirviendo WordPress directo desde Apache (confirmado con `curl -I https://contenidosad.com`, sin headers de Cloudflare). Conectar el dominio real es el único paso con tiempo de propagación real (minutos a 48hs) y con impacto visible para el público — se hace al final, deliberadamente, después de validar todo lo demás sin riesgo.

---

## 1. Conectar el proyecto de Cloudflare Pages en la cuenta nueva

1. Entrar a [pages.cloudflare.com](https://pages.cloudflare.com) (ya logueado en la cuenta **nueva**) → "Create a project" → "Connect to Git"
2. Autorizar acceso al repo de GitHub (`ldevesa/cas-astro`) si todavía no está autorizado en esa cuenta
3. Seleccionar el repo y configurar:

| Setting | Valor |
| :--- | :--- |
| Production branch | `main` |
| Root directory | (dejar vacío / `/` — el repo tiene el sitio en la raíz, `studio/` es solo una subcarpeta) |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node.js version | `22` |

4. **Todavía no hacer el primer deploy** — falta cargar las variables de entorno (paso 2), si no el build va a fallar con `Configuration must contain projectId`.

- [ ] Proyecto creado en la cuenta nueva, apuntando a `main`.

## 2. Variables de entorno — cargar en **Production** y en **Preview**

Mismo gotcha de siempre: Cloudflare separa variables por scope, y si solo se cargan en uno de los dos, el build de las ramas del otro scope falla. Cargar esta lista completa **en los dos scopes**:

| Variable | Tipo | Valor |
| :--- | :--- | :--- |
| `PUBLIC_SANITY_PROJECT_ID` | Texto | `21wszpvy` |
| `PUBLIC_SANITY_DATASET` | Texto | `production` |
| `RESEND_API_KEY` | Secreto | la key de Resend |
| `CONTACT_FROM_EMAIL` | Texto | `onboarding@resend.dev` (hasta verificar un dominio propio en Resend — ver [MANUAL.md § 11](MANUAL.md#11-variables-de-entorno)) |
| `CONTACT_FROM_NAME` | Texto | `CAS` |
| `CONTACT_TO` | Texto | destinatarios del formulario, separados por coma |
| `CONTACT_BCC` | Texto | opcional |
| `MJ_APIKEY_PUBLIC` | Secreto | opcional — habilita el fallback a Mailjet si Resend falla |
| `MJ_APIKEY_PRIVATE` | Secreto | opcional — ídem |

- [ ] Las 9 variables cargadas en **Production**.
- [ ] Las 9 variables cargadas en **Preview**.
- [ ] Deploy inicial disparado (push a `main`, o "Retry deployment" si ya se había intentado sin las variables) y verificado sin errores.

## 3. Deploy Hook + Webhook de Sanity → cuenta nueva

El webhook actual en Sanity apunta al Deploy Hook de la cuenta **vieja** — hay que armar uno nuevo para la cuenta nueva (no se puede reutilizar el mismo Deploy Hook entre cuentas de Cloudflare distintas).

1. En el proyecto nuevo de Cloudflare → Settings/Configuración → **Desarrollo** (no "General") → "Enlaces de implementación" (Deploy Hooks) → crear uno apuntando a `main` → copiar la URL
2. En [sanity.io/manage](https://sanity.io/manage) → proyecto `21wszpvy` → API → Webhooks → crear uno nuevo:
   - Dataset: `production`
   - URL: la del Deploy Hook recién creado
   - Trigger: Create / Update / Delete
   - Filtro: `_type in ["caso", "cliente", "carrera", "paginaHome"]`
3. Probar: publicar cualquier cambio en el Studio y confirmar que dispara un deployment nuevo en el proyecto de la cuenta nueva

**Recordatorio permanente:** cada `_type` de documento nuevo que se agregue en Sanity hay que sumarlo a este filtro, en los dos webhooks (viejo y nuevo, mientras convivan) — si no, publicar contenido de ese tipo no dispara ningún rebuild y parece que "no anda".

- [x] Deploy Hook creado en la cuenta nueva (31/07).
- [x] Webhook nuevo creado en Sanity (`Cloudflare (main)`), apuntando a ese Deploy Hook, dataset `production`, filtro correcto (31/07).
- [ ] Probado de punta a punta.
- [x] Webhook viejo (`Cloudflare rebuild`, apunta al proyecto de Cloudflare ya borrado) eliminado en sanity.io/manage (31/07).

## 4. Autorizar el nuevo dominio `.pages.dev` en CORS de Sanity

Necesario para que el video del Hero (cuando la fuente es "incrustado" con el efecto ASCII activo) cargue sin error — ver detalle en [MANUAL.md § 5](MANUAL.md#cors-dominios-autorizados-a-pedir-assets-de-sanity).

```bash
cd studio
npx sanity cors add https://<nombre-del-proyecto-nuevo>.pages.dev --no-credentials
```

- [x] Dominio `.pages.dev` de la cuenta nueva agregado a CORS origins (`https://cas-sitio.pages.dev`, 31/07).
- [x] Verificado sin errores de CORS en la consola del navegador al cargar la Home con el efecto del Hero activo (31/07).

## 5. Validación completa en la cuenta nueva

Navegar la URL `.pages.dev` de la cuenta nueva en los 3 idiomas y confirmar:

- [ ] Home (con el Hero — probar los 3 tipos de fuente de video si se cargaron), casos (listado + detalle + paginación), carreras (listado + detalle), clientes.
- [ ] Selector de idioma (ES/PT/EN) en todas las páginas de arriba.
- [ ] Formulario de contacto — probarlo de verdad, confirmar que llega el email (recordar la limitación de sandbox de Resend: solo entrega al email de la cuenta de Resend hasta verificar el dominio).
- [ ] Imágenes, galería y video de YouTube en un caso.
- [ ] Nada roto visualmente (revisar mobile también).

## 6. Conectar el dominio real (`contenidosad.com`)

Este es el paso que **de verdad** prende el sitio nuevo para el público — todo lo anterior no toca nada visible en `contenidosad.com`.

1. En el proyecto de Cloudflare (cuenta nueva) → Custom Domains → agregar `contenidosad.com` (y subdominios si aplica)
2. Actualizar los registros DNS donde esté administrado el dominio hoy, según lo que indique Cloudflare — tener en cuenta el tiempo de propagación (minutos a 48hs)
3. Una vez propagado, agregar `https://contenidosad.com` a CORS de Sanity, igual que en el paso 4:
   ```bash
   npx sanity cors add https://contenidosad.com --no-credentials
   ```
4. Si se quiere seguir viendo la versión WordPress en paralelo por un tiempo (comparar, rollback visual rápido), considerar guardarla en un dominio/subdominio aparte antes de mover el DNS — sino, una vez que el DNS apunte a Cloudflare, WordPress deja de ser visible en `contenidosad.com` (sigue funcionando en el servidor, solo que ya no es lo que responde ese dominio).

- [ ] `contenidosad.com` agregado como Custom Domain en Cloudflare (cuenta nueva).
- [ ] DNS actualizado y propagado.
- [ ] CORS de Sanity actualizado con el dominio real.
- [ ] `contenidosad.com` (y `/pt`, `/en`) sirviendo contenido de Sanity — confirmado.

## 7. Después del cutover

- [ ] Purgar caché de Cloudflare si hace falta que se vea al instante (Dashboard → Caching → "Purge everything").
- [ ] Decidir cuándo apagar `contenidosad.com`/`contentad.net` como WordPress (se puede dejar corriendo en paralelo sin costo/riesgo mientras se confirma que todo anda bien en Sanity — no hay apuro).
- [ ] Decidir qué hacer con el proyecto viejo de Cloudflare (cuenta actual) — dar de baja o dejarlo como respaldo.
- [ ] Considerar revocar el token de escritura de `migration/.env` en sanity.io/manage una vez que no se vaya a re-correr la migración nunca más.
- [ ] Si `contenidosad.com` sigue en modo sandbox de Resend, verificar el dominio ahí para poder mandar el formulario de contacto a cualquier destinatario (ver [MANUAL.md § 11](MANUAL.md#11-variables-de-entorno)).

### Si algo sale mal

Antes de conectar el dominio real (paso 6), el rollback es trivial: no hiciste nada visible al público todavía, solo desconectás el Custom Domain si llegaste a agregarlo. Después de conectar el dominio, el rollback es apuntar el DNS de vuelta al hosting de WordPress — por eso conviene no apurar el paso 6 hasta validar todo lo demás.
