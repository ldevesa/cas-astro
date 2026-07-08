import { decodeEntities } from './text.mjs';

function normalize(str) {
  return decodeEntities(str)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita acentos
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function bigrams(str) {
  const s = str.replace(/ /g, '');
  const grams = [];
  for (let i = 0; i < s.length - 1; i++) grams.push(s.slice(i, i + 2));
  return grams;
}

/** Coeficiente de Dice sobre bigramas: 1 = idéntico, 0 = sin relación. */
function similarity(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;

  const ga = bigrams(na);
  const gb = [...bigrams(nb)];
  let matches = 0;
  for (const g of ga) {
    const idx = gb.indexOf(g);
    if (idx !== -1) {
      matches++;
      gb.splice(idx, 1);
    }
  }
  return (2 * matches) / (ga.length + gb.length + matches || 1);
}

function confidenceFor(score) {
  if (score >= 0.9) return 'high';
  if (score >= 0.6) return 'medium';
  return 'low';
}

/**
 * Empareja records `source` (ES) con `candidates` (EN) por similitud de título.
 * Asignación greedy 1:1 — cada score se asigna una sola vez, de mayor a menor.
 * Devuelve un array con un item por cada `source`, con match (o null) + score.
 */
export function matchByTitle(source, candidates, { titleOf, threshold = 0.35 } = {}) {
  const pairs = [];
  for (const s of source) {
    for (const c of candidates) {
      const score = similarity(titleOf(s), titleOf(c));
      if (score >= threshold) pairs.push({ s, c, score });
    }
  }
  pairs.sort((a, b) => b.score - a.score);

  const usedSource = new Set();
  const usedCandidate = new Set();
  const assigned = new Map();

  for (const { s, c, score } of pairs) {
    if (usedSource.has(s.id) || usedCandidate.has(c.id)) continue;
    usedSource.add(s.id);
    usedCandidate.add(c.id);
    assigned.set(s.id, { candidate: c, score });
  }

  return source.map((s) => {
    const match = assigned.get(s.id);
    return {
      sourceId: s.id,
      sourceTitle: titleOf(s),
      sourceSlug: s.slug,
      matchId: match?.candidate.id ?? null,
      matchTitle: match ? titleOf(match.candidate) : null,
      matchSlug: match?.candidate.slug ?? null,
      score: match ? Number(match.score.toFixed(3)) : 0,
      confidence: match ? confidenceFor(match.score) : 'none',
      reviewed: false,
    };
  });
}
