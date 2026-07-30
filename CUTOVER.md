# Checklist: pasar `sanity-migration` a producción

Pasos para cuando se decida cortar de WordPress a Sanity en el sitio real (`contenidosad.com`). No son automáticos — se ejecutan a mano, en orden, cuando el equipo esté listo.

Contexto de la migración: ver [CLAUDE.md](CLAUDE.md).

## 0. Decisión: el cutover se hace directo en la cuenta nueva

Sistemas va a crear una cuenta nueva (con su propio mail) para tener este sitio con cuenta propia en **Cloudflare** y en **Sanity**, separada de las cuentas actuales usadas para armar y probar todo esto. Se decidió **no** hacer primero el cutover en la cuenta actual y migrar después — se salta directo a producción en la cuenta nueva, para no duplicar el trabajo.

Mientras se espera esa cuenta, se sigue trabajando y probando normalmente sobre `sanity-migration.cas-astro.pages.dev` (cuenta actual) — no cambia nada del día a día hasta entonces.

Cuando llegue la cuenta nueva, dos frentes distintos:

- **Sanity**: usar la función nativa de **"Transfer project"** (sanity.io/manage → proyecto → Settings) para pasar el proyecto existente (`21wszpvy`, con todo el contenido ya migrado) a la organización nueva — no hay que re-migrar nada, el proyecto y el dataset siguen siendo los mismos.
- **Cloudflare**: se crea el proyecto Pages **desde cero** en la cuenta nueva ("Connect to Git" al mismo repo de GitHub), y ahí es donde se ejecutan los pasos 1 a 9 de abajo (env vars, webhook, Deploy Hooks, y finalmente el merge a `main`) — no en la cuenta actual.

### Dato importante confirmado (29/07): `contenidosad.com` hoy no está conectado a Cloudflare Pages

Se verificó con `curl -I https://contenidosad.com` que el dominio real responde directo desde un servidor Apache con WordPress (`Server: Apache/2.4.57`, headers de `wp-json`) — **sin ningún rastro de Cloudflare**. O sea, el proyecto `cas-astro` de Cloudflare (ni `main` ni `sanity-migration`) está conectado al dominio real todavía; son 2 cosas totalmente separadas hasta ahora.

Consecuencia práctica: **mergear `sanity-migration` a `main` en la cuenta actual no cambiaría nada visible en `contenidosad.com`** — solo actualizaría `cas-astro.pages.dev`. El único paso que realmente "prende" el sitio nuevo para el público es conectar el dominio (agregarlo como dominio personalizado en Cloudflare Pages + apuntar el DNS), y **ese paso es el que se está dejando para la cuenta nueva** — es el único con tiempo de propagación real (minutos a 48hs) y el único que tiene sentido hacer una sola vez en vez de dos (ahora + de nuevo al mover de cuenta).

El merge de código en sí es rápido y sin riesgo (build de Cloudflare: 1-2 min) — se podría hacer en cualquier momento, incluso antes de tener la cuenta nueva, sin que afecte al sitio público. Se decidió mantenerlo alineado con el resto del checklist igual, para no tener el código de `main` desactualizado esperando sin necesidad.

---

## 1. Validación final en el preview

Navegar `https://sanity-migration.cas-astro.pages.dev` (o la URL del último deployment de preview en Cloudflare) en los 3 idiomas, y confirmar:

- [ ] Home, casos (listado + detalle + paginación), carreras (listado + detalle), clientes.
- [ ] Selector de idioma (ES/PT/EN) en todas las páginas de arriba.
- [ ] Formulario de contacto — probarlo de verdad, confirmar que llega el email.
- [ ] Imágenes, galería y video de YouTube en un caso.
- [ ] Nada roto visualmente (revisar mobile también).

## 2. Sync final de contenido desde WordPress

Si se siguió cargando contenido en WordPress después de la migración inicial:

```bash
cd migration
npm run extract
npm run match     # revisar migration/reports/*-en-match.json si hay casos/carreras nuevos
npm run transform
npm run import
```

Es idempotente (usa IDs determinísticos), no duplica ni pisa nada que no haya cambiado.

- [ ] Corrido y sin incidencias nuevas en `migration/reports/transform-issues.json` / `import-report.json`.

## 3. Variables de entorno en el scope **Production** de Cloudflare

- [x] `PUBLIC_SANITY_PROJECT_ID` / `PUBLIC_SANITY_DATASET` agregadas en Production (29/07). Como se esperaba (ver [MANUAL.md § 5](MANUAL.md#5-cloudflare-pages)), el primer build después del merge falló con `Configuration must contain projectId` porque solo estaban en Preview — quedó resuelto agregándolas también acá.
- [ ] `RESEND_API_KEY` y variables `CONTACT_*` confirmadas en Production — migradas de Mailjet a Resend en julio 2026 (ver [MANUAL.md § 11](MANUAL.md#11-variables-de-entorno)), falta re-verificar que estén en el scope Production además de Preview.

## 4. Webhook de Sanity → Cloudflare

✅ **Ya armado y probado**, pero apuntando a `sanity-migration` (preview), no a `main` todavía:

- [x] Deploy Hook creado en Cloudflare ("Enlaces de implementación" — Settings/Configuración → **Desarrollo**, no "General") → rama `sanity-migration`.
- [x] Webhook creado en sanity.io/manage → API → Webhooks, dataset `production`, trigger Create/Update/Delete, filtro `_type in ["caso", "cliente", "carrera", "paginaHome"]`.
- [x] Probado de punta a punta: publicar en el Studio dispara un deployment nuevo solo, visible en la URL alias de la rama (`https://sanity-migration.cas-astro.pages.dev` — **no** la URL con hash de un deployment puntual, esa queda congelada para siempre).

**Antes del merge a producción (parte del paso 7, el merge en sí):**
- Crear un Deploy Hook nuevo apuntando a `main`, y o bien agregar un segundo webhook en Sanity apuntando a ese, o editar el existente para que dispare a ambos (Cloudflare permite un solo Deploy Hook por request, así que si se quiere mantener el rebuild automático en `sanity-migration` *y* en `main` simultáneamente, hacen falta 2 webhooks en Sanity, uno por cada Deploy Hook).
- **Recordatorio permanente:** el filtro GROQ del webhook solo dispara para los `_type` listados. Cada vez que se agregue un tipo de documento nuevo en Sanity, hay que sumarlo a ese filtro (ver `MANUAL.md § 5`) — si no, publicar contenido de ese tipo nuevo no actualiza el sitio y parece que "no anda".

## 5. Autorizar el dominio de producción en CORS de Sanity

Necesario para que assets que no son imágenes (por ejemplo el video del Hero del page builder) carguen sin error en el dominio real — ver detalle en [MANUAL.md § 5](MANUAL.md#cors-dominios-autorizados-a-pedir-assets-de-sanity).

```bash
cd studio
npx sanity cors add https://contenidosad.com --no-credentials
```

- [ ] Dominio de producción agregado a CORS origins.
- [ ] Verificado que no aparece ningún error de CORS en la consola del navegador al cargar la home en producción.

## 6. Guardar una copia de la versión WordPress como preview de respaldo

**Importante entender esto antes de mergear:** el merge no deja la versión vieja (WordPress) dando vueltas sola en algún preview — simplemente pasa a ser historia dentro de `main`, ya no deployada en ningún lado. Si querés poder ver/comparar la versión WordPress en una URL propia incluso después de cortar a Sanity, hay que guardarla a propósito **antes** de mergear:

```bash
git checkout main
git pull
git branch wordpress-backup
git push -u origin wordpress-backup
```

Esto crea una rama congelada en el estado exacto de `main` justo antes del corte. Cloudflare le arma su propia URL de preview (`wordpress-backup.cas-astro.pages.dev`), que va a seguir sirviendo la versión con WordPress indefinidamente, sin que el merge posterior la toque para nada.

- [x] Rama `wordpress-backup` creada y pusheada (29/07).
- [x] Confirmado que Cloudflare le generó su URL de preview.

## 7. Mergear `sanity-migration` a `main`

- [x] Merge hecho el 29/07 (commit `2263f3a`, merge commit explícito con `--no-ff` para que el rollback de la sección "Si algo sale mal" funcione tal cual está documentado).

**Corrección a lo que decía acá antes:** este paso, solo, **no prende Sanity en producción para el público** — se confirmó (ver nota en la sección 0) que `contenidosad.com` todavía no está conectado a este proyecto de Cloudflare. El merge actualiza `main`, y con eso `cas-astro.pages.dev` (el alias del proyecto), pero el dominio real sigue sirviendo WordPress sin cambios hasta que se haga la conexión de dominio en la cuenta nueva. El paso que **de verdad** cambia lo que ve el público es el que corresponde a conectar el dominio (dentro del punto 8 de abajo, cuando corresponda hacerlo en la cuenta nueva).

## 8. Verificar el deployment de Production después del merge

Como `contenidosad.com` todavía no está conectado a Cloudflare (ver sección 0), este chequeo hoy se hace sobre el alias del proyecto, no sobre el dominio real:

- [x] Build de Production sin errores en Cloudflare → Deployments (29/07).
- [x] `cas-astro.pages.dev` (y `/pt`, `/en`) sirviendo contenido de Sanity.
- [ ] `contenidosad.com` (y `/pt`, `/en`) sirviendo contenido de Sanity — pendiente hasta conectar el dominio en la cuenta nueva.

## 9. Después del cutover

- [ ] Purgar caché de Cloudflare si hace falta que se vea al instante (Dashboard → Caching → "Purge everything").
- [ ] Decidir cuándo apagar `contenidosad.com`/`contentad.net` como WordPress (se puede dejar corriendo en paralelo sin costo/riesgo mientras se confirma que todo anda bien en Sanity — no hay apuro).
- [ ] Considerar revocar el token de escritura de `migration/.env` en sanity.io/manage una vez que no se vaya a re-correr la migración nunca más.

### Si algo sale mal

Rollback simple: revertir el merge en `main` y pushear. Cloudflare rebuildea con el código viejo (WordPress) en 1-2 minutos — gracias al paso 6, esa misma versión ya la estuviste viendo funcionar en `wordpress-backup`, así que no es un salto a ciegas.

```bash
git revert -m 1 <hash del merge commit>
git push
```
