import { ui, type Lang } from './ui';

export function getLang(locale: string | undefined): Lang {
  if (locale === 'pt' || locale === 'en') return locale;
  return 'es';
}

/** Returns the translation object for the given locale. */
export function useTranslations(locale: string | undefined) {
  return ui[getLang(locale)];
}

/**
 * Builds a locale-prefixed path.
 * ES (default locale) has no prefix.
 * PT → /pt/path
 * EN → /en/path
 */
export function getLocalePath(locale: string | undefined, path: string): string {
  const lang = getLang(locale);
  if (lang === 'es') return path;
  const stripped = path.startsWith('/') ? path : `/${path}`;
  return `/${lang}${stripped === '/' ? '' : stripped}`;
}

/**
 * Given the current URL pathname, returns equivalent paths for all locales.
 * Strips any existing locale prefix before building the map.
 */
export function getLangSwitcherPaths(pathname: string): Record<Lang, string> {
  let base = pathname;
  if (pathname.startsWith('/pt/')) base = pathname.slice(3);
  else if (pathname.startsWith('/en/')) base = pathname.slice(3);
  else if (pathname === '/pt' || pathname === '/en') base = '/';

  const normalised = base || '/';

  return {
    es: normalised,
    pt: `/pt${normalised === '/' ? '/' : normalised}`,
    en: `/en${normalised === '/' ? '/' : normalised}`,
  };
}
