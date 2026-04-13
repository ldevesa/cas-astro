const WP_ES_PT = import.meta.env.PUBLIC_WP_URL ?? 'https://contenidosad.com';
const WP_EN   = import.meta.env.PUBLIC_WP_URL_EN ?? 'https://contentad.net';

function getAPIBase(lang: string): string {
  return `${lang === 'en' ? WP_EN : WP_ES_PT}/wp-json/wp/v2`;
}

/** Returns `lang=xx&` for ES/PT; empty string for EN (separate install). */
function lp(lang: string): string {
  return lang !== 'en' ? `lang=${lang}&` : '';
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface WPPage {
  id: number;
  slug: string;
  lang: string;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
  featured_media: number;
  yoast_head_json?: {
    og_image?: { url: string }[];
    og_description?: string;
  };
}

export interface WPPost {
  id: number;
  slug: string;
  lang: string;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
  date: string;
  featured_media: number;
  _embedded?: {
    'wp:featuredmedia'?: { source_url: string; alt_text: string }[];
  };
}

export interface WPMedia {
  id: number;
  source_url: string;
  alt_text: string;
  media_details: { width: number; height: number };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function apiFetch<T>(url: string, retries = 3): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await fetch(url);
    if (res.ok) return res.json() as Promise<T>;
    if (attempt === retries) throw new Error(`WP API error: ${res.status} ${url}`);
    await new Promise(r => setTimeout(r, attempt * 1000));
  }
  throw new Error('WP API error: max retries reached');
}

// ── Pages ─────────────────────────────────────────────────────────────────────

export async function getPageBySlug(slug: string, lang = 'es'): Promise<WPPage | null> {
  const api = getAPIBase(lang);
  const pages = await apiFetch<WPPage[]>(`${api}/pages?slug=${slug}&${lp(lang)}_embed`);
  return pages[0] ?? null;
}

export async function getAllPages(lang = 'es'): Promise<WPPage[]> {
  const api = getAPIBase(lang);
  return apiFetch<WPPage[]>(`${api}/pages?${lp(lang)}per_page=20&_embed`);
}

// ── Posts ─────────────────────────────────────────────────────────────────────

export async function getPosts(lang = 'es', perPage = 12): Promise<WPPost[]> {
  const api = getAPIBase(lang);
  return apiFetch<WPPost[]>(`${api}/posts?${lp(lang)}per_page=${perPage}&_embed`);
}

export async function getPostBySlug(slug: string, lang = 'es'): Promise<WPPost | null> {
  const api = getAPIBase(lang);
  const posts = await apiFetch<WPPost[]>(`${api}/posts?slug=${slug}&${lp(lang)}_embed`);
  return posts[0] ?? null;
}

// ── Media ─────────────────────────────────────────────────────────────────────

export async function getMedia(id: number, lang = 'es'): Promise<WPMedia | null> {
  if (!id) return null;
  try {
    const api = getAPIBase(lang);
    return await apiFetch<WPMedia>(`${api}/media/${id}`);
  } catch {
    return null;
  }
}

// ── Site info ─────────────────────────────────────────────────────────────────

export interface SiteData {
  headline: string;
  subheadline: string;
  offices: { city: string; address: string }[];
  socialLinks: { platform: string; url: string }[];
}

export function getStaticSiteData(): SiteData {
  return {
    headline: 'Conectamos marcas con consumidores a través de experiencias memorables',
    subheadline: 'Captar la atención del consumidor',
    offices: [
      { city: 'Buenos Aires', address: 'Echeverría 760, Vte. López, Bs. As.' },
      { city: 'Ciudad de México', address: 'Av. Homero 1804, of. 204, Polanco, CDMX' },
      { city: 'Madrid', address: "C/ O'Donnell N°14 enpta, 28009" },
      { city: 'Miami', address: '1000 Brickell Ave, Suite 905, FL 33131' },
    ],
    socialLinks: [
      { platform: 'Instagram', url: 'https://www.instagram.com/contenidos.ad' },
      { platform: 'LinkedIn', url: 'https://www.linkedin.com/company/contenidosad/' },
    ],
  };
}

// ── Casos (custom post type) ──────────────────────────────────────────────────

export interface WPCaso {
  id: number;
  slug: string;
  lang: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
  yoast_head_json?: {
    og_image?: { url: string }[];
    og_description?: string;
  };
  acf?: {
    resumen?:        string;
    subtitulo?:      string;
    mercados?:       string;
    titulo_mercado?: string;
    post_campana?:   string;
    image_carousel?: { image: { url: string; alt: string } }[] | false;
  };
  _embedded?: {
    'wp:featuredmedia'?: { source_url: string; alt_text: string }[];
    'wp:term'?: { id: number; name: string; slug: string }[][];
  };
}

export async function getCasos(lang = 'es', perPage = 6): Promise<WPCaso[]> {
  const api = getAPIBase(lang);
  return apiFetch<WPCaso[]>(`${api}/casos?${lp(lang)}per_page=${perPage}&_embed`);
}

export async function getAllCasos(lang = 'es'): Promise<WPCaso[]> {
  const api = getAPIBase(lang);
  return apiFetch<WPCaso[]>(`${api}/casos?${lp(lang)}per_page=100&_embed`);
}

export async function getCasoBySlug(slug: string, lang = 'es'): Promise<WPCaso | null> {
  const api = getAPIBase(lang);
  const casos = await apiFetch<WPCaso[]>(`${api}/casos?slug=${slug}&${lp(lang)}_embed`);
  return casos[0] ?? null;
}

export interface CasosPage {
  casos: WPCaso[];
  total: number;
  totalPages: number;
}

export async function getCasosPage(page = 1, perPage = 6, lang = 'es'): Promise<CasosPage> {
  const api = getAPIBase(lang);
  const res = await fetch(`${api}/casos?${lp(lang)}per_page=${perPage}&page=${page}&_embed`);
  if (!res.ok) throw new Error(`WP API error: ${res.status} /casos`);
  const total      = parseInt(res.headers.get('X-WP-Total') ?? '0', 10);
  const totalPages = parseInt(res.headers.get('X-WP-TotalPages') ?? '1', 10);
  const casos      = await res.json() as WPCaso[];
  return { casos, total, totalPages };
}

// ── Caso ACF helpers ──────────────────────────────────────────────────────────

export function getCasoResumen(caso: WPCaso): string {
  return caso.acf?.resumen?.trim() ?? '';
}

export function getCasoSubtitulo(caso: WPCaso): string {
  return caso.acf?.subtitulo?.trim() ?? '';
}

export function getCasoMercado(caso: WPCaso): string {
  return caso.acf?.mercados?.trim() ?? '';
}

export function getCasoYoutubeId(caso: WPCaso): string {
  const iframe = caso.acf?.post_campana ?? '';
  const match = iframe.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
  return match?.[1] ?? '';
}

export function getCasoGallery(caso: WPCaso): string[] {
  const raw = caso.acf?.image_carousel;
  if (!Array.isArray(raw)) return [];
  return raw.map(item => item.image?.url).filter(Boolean) as string[];
}

export function getCasoImage(caso: WPCaso): string {
  return caso?._embedded?.['wp:featuredmedia']?.[0]?.source_url ?? '/img/placeholder.jpg';
}

export function getCasoImageAlt(caso: WPCaso): string {
  return caso?._embedded?.['wp:featuredmedia']?.[0]?.alt_text || caso?.title?.rendered || '';
}

// ── Carreras (custom post type) ───────────────────────────────────────────────

export interface WPCarrera {
  id: number;
  slug: string;
  title: { rendered: string };
  content: { rendered: string };
  acf?: {
    tipo?: string;
    area_trabajo?: string;
    categoria?: string;
    fecha?: string;
  };
}

export async function getCarreras(lang = 'es'): Promise<WPCarrera[]> {
  const api = getAPIBase(lang);
  return apiFetch<WPCarrera[]>(`${api}/carreras?${lp(lang)}per_page=50`);
}

export async function getCarreraBySlug(slug: string, lang = 'es'): Promise<WPCarrera | null> {
  const api = getAPIBase(lang);
  const items = await apiFetch<WPCarrera[]>(`${api}/carreras?slug=${slug}&${lp(lang)}`);
  return items[0] ?? null;
}

// ── Clientes (custom post type) ───────────────────────────────────────────────

export interface WPCliente {
  id: number;
  title: { rendered: string };
  _embedded?: {
    'wp:featuredmedia'?: { source_url: string; alt_text: string }[];
  };
}

export async function getClientes(lang = 'es'): Promise<WPCliente[]> {
  const api = getAPIBase(lang);
  return apiFetch<WPCliente[]>(`${api}/clientes?${lp(lang)}per_page=100&_embed`);
}

export function getClienteLogo(cliente: WPCliente): string {
  return cliente._embedded?.['wp:featuredmedia']?.[0]?.source_url ?? '';
}
