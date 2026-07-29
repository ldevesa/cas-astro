import 'dotenv/config';
import { readFile, writeFile } from 'node:fs/promises';
import { createClient } from '@sanity/client';
import { mapLimit } from './lib/concurrency.mjs';

const TRANSFORMED = new URL('../transformed/', import.meta.url);
const REPORTS = new URL('../reports/', import.meta.url);
const ASSET_MAP_PATH = new URL('asset-map.json', REPORTS);

const { SANITY_PROJECT_ID, SANITY_DATASET, SANITY_API_TOKEN } = process.env;

if (!SANITY_PROJECT_ID || !SANITY_DATASET || !SANITY_API_TOKEN) {
  console.error('Faltan SANITY_PROJECT_ID / SANITY_DATASET / SANITY_API_TOKEN en migration/.env');
  process.exit(1);
}

const client = createClient({
  projectId: SANITY_PROJECT_ID,
  dataset: SANITY_DATASET,
  apiVersion: '2026-01-01',
  token: SANITY_API_TOKEN,
  useCdn: false,
});

async function loadJSON(dir, name) {
  return JSON.parse(await readFile(new URL(`${name}.json`, dir), 'utf8'));
}

async function loadAssetMap() {
  try {
    return JSON.parse(await readFile(ASSET_MAP_PATH, 'utf8'));
  } catch {
    return {};
  }
}

async function saveAssetMap(map) {
  await writeFile(ASSET_MAP_PATH, JSON.stringify(map, null, 2));
}

/** Recorre un documento y junta todos los objetos {sourceUrl, alt} (placeholders de imagen). */
function collectImageRefs(value, acc = new Set()) {
  if (Array.isArray(value)) {
    value.forEach((v) => collectImageRefs(v, acc));
  } else if (value && typeof value === 'object') {
    if (value._placeholder === 'image') acc.add(value.sourceUrl);
    else Object.values(value).forEach((v) => collectImageRefs(v, acc));
  }
  return acc;
}

/** Reemplaza cada {sourceUrl, alt} por un asset de Sanity real, usando el mapa url → assetId. */
function resolveImageRefs(value, assetMap, failures) {
  if (Array.isArray(value)) {
    return value.map((v) => resolveImageRefs(v, assetMap, failures)).filter((v) => v !== undefined);
  }
  if (value && typeof value === 'object') {
    if (value._placeholder === 'image') {
      const assetId = assetMap[value.sourceUrl];
      if (!assetId) {
        failures.push(value.sourceUrl);
        return undefined;
      }
      const image = { _type: 'image', asset: { _type: 'reference', _ref: assetId } };
      if (value.alt) image.alt = value.alt;
      return image;
    }
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      const resolved = resolveImageRefs(v, assetMap, failures);
      if (resolved !== undefined) out[k] = resolved;
    }
    return out;
  }
  return value;
}

function guessContentType(url) {
  if (/\.png$/i.test(url)) return 'image/png';
  if (/\.webp$/i.test(url)) return 'image/webp';
  if (/\.gif$/i.test(url)) return 'image/gif';
  return 'image/jpeg';
}

async function uploadAssets(urls, assetMap) {
  const pending = urls.filter((url) => !assetMap[url]);
  console.log(`Assets: ${urls.length} referenciados, ${pending.length} por subir (${urls.length - pending.length} ya en cache).`);

  const uploadFailures = [];
  let uploaded = 0;

  await mapLimit(pending, 4, async (url) => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buffer = Buffer.from(await res.arrayBuffer());
      const filename = decodeURIComponent(url.split('/').pop() ?? 'image.jpg');
      const asset = await client.assets.upload('image', buffer, {
        filename,
        contentType: guessContentType(url),
      });
      assetMap[url] = asset._id;
      uploaded++;
      if (uploaded % 10 === 0) {
        console.log(`  ${uploaded}/${pending.length} subidos...`);
        await saveAssetMap(assetMap);
      }
    } catch (err) {
      uploadFailures.push({ url, error: String(err) });
    }
  });

  await saveAssetMap(assetMap);
  console.log(`Assets subidos: ${uploaded}. Fallos: ${uploadFailures.length}.`);
  return uploadFailures;
}

async function importDocType(name, documents, assetMap, docFailures) {
  let ok = 0;
  await mapLimit(documents, 4, async (doc) => {
    const failures = [];
    const resolved = resolveImageRefs(doc, assetMap, failures);
    if (failures.length) {
      docFailures.push({ _id: doc._id, missingAssets: failures });
    }
    try {
      await client.createOrReplace(resolved);
      ok++;
    } catch (err) {
      docFailures.push({ _id: doc._id, error: String(err) });
    }
  });
  console.log(`${name}: ${ok}/${documents.length} documentos escritos.`);
}

async function main() {
  const [casos, carreras, clientes] = await Promise.all([
    loadJSON(TRANSFORMED, 'caso'),
    loadJSON(TRANSFORMED, 'carrera'),
    loadJSON(TRANSFORMED, 'cliente'),
  ]);

  const allUrls = new Set();
  [...casos, ...carreras, ...clientes].forEach((doc) => collectImageRefs(doc, allUrls));

  const assetMap = await loadAssetMap();
  const uploadFailures = await uploadAssets([...allUrls], assetMap);

  const docFailures = [];
  await importDocType('caso', casos, assetMap, docFailures);
  await importDocType('carrera', carreras, assetMap, docFailures);
  await importDocType('cliente', clientes, assetMap, docFailures);

  await writeFile(
    new URL('import-report.json', REPORTS),
    JSON.stringify({ uploadFailures, docFailures }, null, 2)
  );

  console.log(`\nListo. ${uploadFailures.length} assets con error, ${docFailures.length} documentos con incidencias.`);
  console.log('Detalle en migration/reports/import-report.json');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
