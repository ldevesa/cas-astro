const WP_ES_PT = 'https://contenidosad.com';
const WP_EN = 'https://contentad.net';

function apiBase(lang) {
  return `${lang === 'en' ? WP_EN : WP_ES_PT}/wp-json/wp/v2`;
}

function langParam(lang) {
  return lang !== 'en' ? `lang=${lang}&` : '';
}

export async function fetchAll(postType, lang, { embed = true, perPage = 100 } = {}) {
  const base = apiBase(lang);
  const embedParam = embed ? '_embed' : '';
  const url = `${base}/${postType}?${langParam(lang)}per_page=${perPage}&${embedParam}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`WP API error ${res.status} for ${url}`);
  const totalPages = parseInt(res.headers.get('X-WP-TotalPages') ?? '1', 10);
  const first = await res.json();

  if (totalPages <= 1) return first;

  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, i) => i + 2).map(async (page) => {
      const pageUrl = `${url}&page=${page}`;
      const pageRes = await fetch(pageUrl);
      if (!pageRes.ok) throw new Error(`WP API error ${pageRes.status} for ${pageUrl}`);
      return pageRes.json();
    })
  );

  return [first, ...rest].flat();
}
