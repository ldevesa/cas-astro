# Checklist: pasar `sanity-migration` a producción

Pasos para cuando se decida cortar de WordPress a Sanity en el sitio real (`contenidosad.com`). No son automáticos — se ejecutan a mano, en orden, cuando el equipo esté listo.

Contexto de la migración: ver [CLAUDE.md](CLAUDE.md).

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

Hoy `PUBLIC_SANITY_PROJECT_ID` y `PUBLIC_SANITY_DATASET` solo están cargadas en el scope **Preview** (ver [MANUAL.md § 5](MANUAL.md#5-cloudflare-pages)). Sin esto en Production, el primer build después del merge falla con `Configuration must contain projectId`.

- [ ] Cloudflare Pages → proyecto `cas-astro` → Settings → Environment variables → agregar ambas variables en **Production**.
- [ ] De paso, confirmar que las variables de Mailjet (`MJ_*`, `CONTACT_*`) también están en Production (deberían seguir ahí de antes, sin cambios).

## 4. Webhook de Sanity → Cloudflare

✅ **Ya armado y probado**, pero apuntando a `sanity-migration` (preview), no a `main` todavía:

- [x] Deploy Hook creado en Cloudflare ("Enlaces de implementación" — Settings/Configuración → **Desarrollo**, no "General") → rama `sanity-migration`.
- [x] Webhook creado en sanity.io/manage → API → Webhooks, dataset `production`, trigger Create/Update/Delete, filtro `_type in ["caso", "cliente", "carrera"]`.
- [x] Probado de punta a punta: publicar en el Studio dispara un deployment nuevo solo, visible en la URL alias de la rama (`https://sanity-migration.cas-astro.pages.dev` — **no** la URL con hash de un deployment puntual, esa queda congelada para siempre).

**Antes del merge a producción (parte del paso 6):** crear un Deploy Hook nuevo apuntando a `main`, y o bien agregar un segundo webhook en Sanity apuntando a ese, o editar el existente para que dispare a ambos (Cloudflare permite un solo Deploy Hook por request, así que si se quiere mantener el rebuild automático en `sanity-migration` *y* en `main` simultáneamente, hacen falta 2 webhooks en Sanity, uno por cada Deploy Hook).

## 5. Guardar una copia de la versión WordPress como preview de respaldo

**Importante entender esto antes de mergear:** el merge no deja la versión vieja (WordPress) dando vueltas sola en algún preview — simplemente pasa a ser historia dentro de `main`, ya no deployada en ningún lado. Si querés poder ver/comparar la versión WordPress en una URL propia incluso después de cortar a Sanity, hay que guardarla a propósito **antes** de mergear:

```bash
git checkout main
git pull
git branch wordpress-backup
git push -u origin wordpress-backup
```

Esto crea una rama congelada en el estado exacto de `main` justo antes del corte. Cloudflare le arma su propia URL de preview (`wordpress-backup.cas-astro.pages.dev`), que va a seguir sirviendo la versión con WordPress indefinidamente, sin que el merge posterior la toque para nada.

- [ ] Rama `wordpress-backup` creada y pusheada.
- [ ] Confirmado que Cloudflare le generó su URL de preview.

## 6. Mergear `sanity-migration` a `main`

**Este es el paso que efectivamente prende Sanity en producción.** Todo lo anterior es preparación sin riesgo; este es el único que cambia el sitio en vivo.

- [ ] Pull Request de `sanity-migration` → `main` en GitHub (o merge directo).
- [ ] Confirmar que el merge no tiene conflictos.

## 7. Verificar el deployment de Production después del merge

Mismo chequeo del punto 1, pero ahora en el dominio real.

- [ ] `contenidosad.com` (y `/pt`, `/en`) sirviendo contenido de Sanity.
- [ ] Build de Production sin errores en Cloudflare → Deployments.

## 8. Después del cutover

- [ ] Purgar caché de Cloudflare si hace falta que se vea al instante (Dashboard → Caching → "Purge everything").
- [ ] Decidir cuándo apagar `contenidosad.com`/`contentad.net` como WordPress (se puede dejar corriendo en paralelo sin costo/riesgo mientras se confirma que todo anda bien en Sanity — no hay apuro).
- [ ] Considerar revocar el token de escritura de `migration/.env` en sanity.io/manage una vez que no se vaya a re-correr la migración nunca más.

### Si algo sale mal

Rollback simple: revertir el merge en `main` y pushear. Cloudflare rebuildea con el código viejo (WordPress) en 1-2 minutos — gracias al paso 5, esa misma versión ya la estuviste viendo funcionar en `wordpress-backup`, así que no es un salto a ciegas.

```bash
git revert -m 1 <hash del merge commit>
git push
```
