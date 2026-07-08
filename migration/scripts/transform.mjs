import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { htmlToPortableText } from './lib/portable-text.mjs';
import { clean, decodeEntities, localized, stripTranslateJunk } from './lib/text.mjs';

const EXTRACTED = new URL('../extracted/', import.meta.url);
const REPORTS = new URL('../reports/', import.meta.url);
const TRANSFORMED = new URL('../transformed/', import.meta.url);

const issues = [];
function logIssue(type, id, message) {
  issues.push({ type, id, message });
}

async function loadJSON(dir, name) {
  return JSON.parse(await readFile(new URL(`${name}.json`, dir), 'utf8'));
}

function imageRef(url, alt) {
  if (!url) return undefined;
  return { _placeholder: 'image', sourceUrl: url, alt: clean(alt) };
}

function featuredImage(record) {
  const media = record._embedded?.['wp:featuredmedia']?.[0];
  if (!media?.source_url) return undefined;
  return imageRef(media.source_url, media.alt_text);
}

function localizedContent(esHtml, ptHtml, enHtml) {
  const value = {};
  const es = htmlToPortableText(esHtml);
  const pt = htmlToPortableText(ptHtml);
  const en = htmlToPortableText(stripTranslateJunk(enHtml));
  if (es) value.es = es;
  if (pt) value.pt = pt;
  if (en) value.en = en;
  return Object.keys(value).length ? value : undefined;
}

function youtubeId(...iframeCandidates) {
  for (const iframe of iframeCandidates) {
    const match = (iframe ?? '').match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
  }
  return undefined;
}

// ── Casos ────────────────────────────────────────────────────────────────────

async function transformCasos() {
  const es = await loadJSON(EXTRACTED, 'casos-es');
  const pt = await loadJSON(EXTRACTED, 'casos-pt');
  const en = await loadJSON(EXTRACTED, 'casos-en');
  const matchReport = await loadJSON(REPORTS, 'casos-en-match');

  const ptById = new Map(pt.map((r) => [r.id, r]));
  const enById = new Map(en.map((r) => [r.id, r]));
  const matchByEsId = new Map(matchReport.rows.map((r) => [r.sourceId, r]));

  return es.map((esRecord) => {
    const ptRecord = ptById.get(esRecord.translations?.pt);
    const match = matchByEsId.get(esRecord.id);
    const enRecord = match?.matchId ? enById.get(match.matchId) : undefined;

    if (!ptRecord) logIssue('caso', esRecord.id, 'Sin versión en portugués (translations.pt no resuelve)');
    if (!enRecord) logIssue('caso', esRecord.id, 'Sin versión en inglés');

    const image = featuredImage(esRecord) ?? featuredImage(ptRecord) ?? featuredImage(enRecord);
    if (!image) logIssue('caso', esRecord.id, 'Sin imagen destacada — el schema la requiere, completar a mano');

    const gallery = (Array.isArray(esRecord.acf?.image_carousel) ? esRecord.acf.image_carousel : [])
      .map((item) => imageRef(item.image?.url, item.image?.alt))
      .filter(Boolean);

    return {
      _id: `caso-${esRecord.id}`,
      _type: 'caso',
      titulo: localized({ es: esRecord.title.rendered, pt: ptRecord?.title.rendered, en: enRecord?.title.rendered }),
      slug: { _type: 'slug', current: esRecord.slug },
      subtitulo: localized({ es: esRecord.acf?.subtitulo, pt: ptRecord?.acf?.subtitulo, en: enRecord?.acf?.subtitulo }),
      resumen: localized({ es: esRecord.acf?.resumen, pt: ptRecord?.acf?.resumen, en: enRecord?.acf?.resumen }),
      mercado: localized({ es: esRecord.acf?.mercados, pt: ptRecord?.acf?.mercados, en: enRecord?.acf?.mercados }),
      contenido: localizedContent(esRecord.content.rendered, ptRecord?.content.rendered, enRecord?.content.rendered),
      imagenDestacada: image,
      galeria: gallery.length ? gallery : undefined,
      videoYoutubeId: youtubeId(esRecord.acf?.post_campana, ptRecord?.acf?.post_campana),
      migracion: { sourceSystem: 'wordpress', sourceId: esRecord.id, sourceUrl: esRecord.link },
    };
  });
}

// ── Carreras ─────────────────────────────────────────────────────────────────

async function transformCarreras() {
  const es = await loadJSON(EXTRACTED, 'carreras-es');
  const pt = await loadJSON(EXTRACTED, 'carreras-pt');
  const en = await loadJSON(EXTRACTED, 'carreras-en');
  const matchReport = await loadJSON(REPORTS, 'carreras-en-match');

  const ptById = new Map(pt.map((r) => [r.id, r]));
  const enById = new Map(en.map((r) => [r.id, r]));
  const matchByEsId = new Map(matchReport.rows.map((r) => [r.sourceId, r]));

  return es.map((esRecord) => {
    const ptRecord = ptById.get(esRecord.translations?.pt);
    const match = matchByEsId.get(esRecord.id);
    const enRecord = match?.matchId ? enById.get(match.matchId) : undefined;

    if (!ptRecord) logIssue('carrera', esRecord.id, 'Sin versión en portugués');
    if (!enRecord) logIssue('carrera', esRecord.id, 'Sin versión en inglés');

    return {
      _id: `carrera-${esRecord.id}`,
      _type: 'carrera',
      titulo: localized({ es: esRecord.title.rendered, pt: ptRecord?.title.rendered, en: enRecord?.title.rendered }),
      slug: { _type: 'slug', current: esRecord.slug },
      tipo: clean(esRecord.acf?.tipo),
      categoria: clean(esRecord.acf?.categoria),
      areaTrabajo: localized({ es: esRecord.acf?.area_trabajo, pt: ptRecord?.acf?.area_trabajo, en: enRecord?.acf?.area_trabajo }),
      fecha: clean(esRecord.acf?.fecha),
      contenido: localizedContent(esRecord.content.rendered, ptRecord?.content.rendered, enRecord?.content.rendered),
      migracion: { sourceSystem: 'wordpress', sourceId: esRecord.id, sourceUrl: esRecord.link },
    };
  });
}

// ── Clientes (no localizado — ver CLAUDE.md) ──────────────────────────────────

async function transformClientes() {
  const es = await loadJSON(EXTRACTED, 'clientes-es');

  return es.map((record) => {
    const logo = featuredImage(record);
    if (!logo) logIssue('cliente', record.id, 'Sin logo — el schema lo requiere, completar a mano');
    return {
      _id: `cliente-${record.id}`,
      _type: 'cliente',
      nombre: clean(decodeEntities(record.title.rendered)),
      logo,
      migracion: { sourceSystem: 'wordpress', sourceId: record.id, sourceUrl: record.link },
    };
  });
}

async function main() {
  const [casos, carreras, clientes] = await Promise.all([transformCasos(), transformCarreras(), transformClientes()]);

  await mkdir(TRANSFORMED, { recursive: true });
  await writeFile(new URL('caso.json', TRANSFORMED), JSON.stringify(casos, null, 2));
  await writeFile(new URL('carrera.json', TRANSFORMED), JSON.stringify(carreras, null, 2));
  await writeFile(new URL('cliente.json', TRANSFORMED), JSON.stringify(clientes, null, 2));

  await mkdir(REPORTS, { recursive: true });
  await writeFile(new URL('transform-issues.json', REPORTS), JSON.stringify(issues, null, 2));

  console.log(`caso: ${casos.length} documentos`);
  console.log(`carrera: ${carreras.length} documentos`);
  console.log(`cliente: ${clientes.length} documentos`);
  console.log(`\n${issues.length} incidencias registradas en migration/reports/transform-issues.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
