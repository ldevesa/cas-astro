export function decodeEntities(str) {
  if (!str) return '';
  return str
    .replace(/&#8217;|&#039;|&apos;/g, "'")
    .replace(/&#8211;|&ndash;/g, '-')
    .replace(/&#8212;|&mdash;/g, '-')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

/** Quita artefactos de Google Translate (divs #gtx-trans) que quedaron pegados en el contenido en inglés. */
export function stripTranslateJunk(html) {
  if (!html) return html;
  return html.replace(/<div id="gtx-trans"[\s\S]*?<\/div>\s*<\/div>/g, '').trim();
}

/** Devuelve el string recortado, o undefined si está vacío (para no guardar campos vacíos en Sanity). */
export function clean(str) {
  const decoded = decodeEntities(str ?? '')
    .replace(/\r\n/g, '\n')
    .trim();
  return decoded || undefined;
}

/** Arma un objeto {es, pt, en} descartando idiomas sin valor; devuelve undefined si ninguno tiene valor. */
export function localized({ es, pt, en }) {
  const value = {};
  if (clean(es)) value.es = clean(es);
  if (clean(pt)) value.pt = clean(pt);
  if (clean(en)) value.en = clean(en);
  return Object.keys(value).length ? value : undefined;
}
