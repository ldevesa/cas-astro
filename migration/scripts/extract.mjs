import { mkdir, writeFile } from 'node:fs/promises';
import { fetchAll } from './lib/wp-api.mjs';

const OUT_DIR = new URL('../extracted/', import.meta.url);

async function save(name, data) {
  await writeFile(new URL(`${name}.json`, OUT_DIR), JSON.stringify(data, null, 2));
  console.log(`✔ ${name}: ${data.length} registros`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const [casosEs, casosPt, casosEn] = await Promise.all([
    fetchAll('casos', 'es'),
    fetchAll('casos', 'pt'),
    fetchAll('casos', 'en'),
  ]);
  await save('casos-es', casosEs);
  await save('casos-pt', casosPt);
  await save('casos-en', casosEn);

  const [carrerasEs, carrerasPt, carrerasEn] = await Promise.all([
    fetchAll('carreras', 'es', { embed: false }),
    fetchAll('carreras', 'pt', { embed: false }),
    fetchAll('carreras', 'en', { embed: false }),
  ]);
  await save('carreras-es', carrerasEs);
  await save('carreras-pt', carrerasPt);
  await save('carreras-en', carrerasEn);

  const [clientesEs, clientesEn] = await Promise.all([
    fetchAll('clientes', 'es'),
    fetchAll('clientes', 'en'),
  ]);
  await save('clientes-es', clientesEs);
  await save('clientes-en', clientesEn);

  console.log('\nExtracción completa. Snapshots guardados en migration/extracted/.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
