import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { matchByTitle } from './lib/match.mjs';

const EXTRACTED = new URL('../extracted/', import.meta.url);
const REPORTS = new URL('../reports/', import.meta.url);

async function loadJSON(name) {
  return JSON.parse(await readFile(new URL(`${name}.json`, EXTRACTED), 'utf8'));
}

async function buildReport(name, titleOf) {
  const es = await loadJSON(`${name}-es`);
  const en = await loadJSON(`${name}-en`);
  const rows = matchByTitle(es, en, { titleOf });

  const summary = rows.reduce(
    (acc, r) => {
      acc[r.confidence] = (acc[r.confidence] ?? 0) + 1;
      return acc;
    },
    { high: 0, medium: 0, low: 0, none: 0 }
  );

  const unmatchedEn = en.filter((e) => !rows.some((r) => r.matchId === e.id));

  await mkdir(REPORTS, { recursive: true });
  await writeFile(
    new URL(`${name}-en-match.json`, REPORTS),
    JSON.stringify({ rows, unmatchedEn: unmatchedEn.map((e) => ({ id: e.id, title: titleOf(e), slug: e.slug })) }, null, 2)
  );

  console.log(`\n${name}: ${es.length} ES → ${en.length} EN`);
  console.log(`  high=${summary.high} medium=${summary.medium} low=${summary.low} none=${summary.none}`);
  if (unmatchedEn.length) {
    console.log(`  EN sin match (posiblemente contenido viejo/huérfano): ${unmatchedEn.length}`);
    unmatchedEn.forEach((e) => console.log(`    - [${e.id}] ${titleOf(e)} (/${e.slug})`));
  }
}

async function main() {
  await buildReport('casos', (r) => r.title.rendered);
  await buildReport('carreras', (r) => r.title.rendered);
  console.log('\nReportes guardados en migration/reports/*-en-match.json. Revisalos antes de correr transform.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
