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

## 4. (Opcional, recomendado) Webhook de Sanity → Cloudflare

Sin esto, cada edición en el Studio requiere redeploy manual — igual que WordPress sin el Deploy Hook. Ver instrucciones en [MANUAL.md § 5](MANUAL.md#configurar-deploy-hook-para-que-sanity-dispare-rebuilds) y [README.md](README.md#configurar-el-webhook-de-sanity-recomendado).

- [ ] Deploy Hook creado en Cloudflare, apuntando a la rama `main`.
- [ ] Webhook creado en sanity.io/manage, apuntando a ese Deploy Hook.

## 5. Mergear `sanity-migration` a `main`

**Este es el paso que efectivamente prende Sanity en producción.** Todo lo anterior es preparación sin riesgo; este es el único que cambia el sitio en vivo.

- [ ] Pull Request de `sanity-migration` → `main` en GitHub (o merge directo).
- [ ] Confirmar que el merge no tiene conflictos.

## 6. Verificar el deployment de Production después del merge

Mismo chequeo del punto 1, pero ahora en el dominio real.

- [ ] `contenidosad.com` (y `/pt`, `/en`) sirviendo contenido de Sanity.
- [ ] Build de Production sin errores en Cloudflare → Deployments.

## 7. Después del cutover

- [ ] Purgar caché de Cloudflare si hace falta que se vea al instante (Dashboard → Caching → "Purge everything").
- [ ] Decidir cuándo apagar `contenidosad.com`/`contentad.net` como WordPress (se puede dejar corriendo en paralelo sin costo/riesgo mientras se confirma que todo anda bien en Sanity — no hay apuro).
- [ ] Considerar revocar el token de escritura de `migration/.env` en sanity.io/manage una vez que no se vaya a re-correr la migración nunca más.

### Si algo sale mal

Rollback simple: revertir el merge en `main` y pushear. Cloudflare rebuildea con el código viejo (WordPress) en 1-2 minutos.

```bash
git revert -m 1 <hash del merge commit>
git push
```
