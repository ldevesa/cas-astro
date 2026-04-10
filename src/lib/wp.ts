const WP_BASE = import.meta.env.PUBLIC_WP_URL ?? 'https://contenidosad.com';
const API = `${WP_BASE}/wp-json/wp/v2`;

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

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`WP API error: ${res.status} ${path}`);
  return res.json() as Promise<T>;
}

// ── Pages ─────────────────────────────────────────────────────────────────────

export async function getPageBySlug(slug: string, lang = 'es'): Promise<WPPage | null> {
  const pages = await apiFetch<WPPage[]>(`/pages?slug=${slug}&lang=${lang}&_embed`);
  return pages[0] ?? null;
}

export async function getAllPages(lang = 'es'): Promise<WPPage[]> {
  return apiFetch<WPPage[]>(`/pages?lang=${lang}&per_page=20&_embed`);
}

// ── Posts / Casos ─────────────────────────────────────────────────────────────

export async function getPosts(lang = 'es', perPage = 12): Promise<WPPost[]> {
  return apiFetch<WPPost[]>(`/posts?lang=${lang}&per_page=${perPage}&_embed`);
}

export async function getPostBySlug(slug: string, lang = 'es'): Promise<WPPost | null> {
  const posts = await apiFetch<WPPost[]>(`/posts?slug=${slug}&lang=${lang}&_embed`);
  return posts[0] ?? null;
}

// ── Media ─────────────────────────────────────────────────────────────────────

export async function getMedia(id: number): Promise<WPMedia | null> {
  if (!id) return null;
  try {
    return await apiFetch<WPMedia>(`/media/${id}`);
  } catch {
    return null;
  }
}

// ── Site info (scraping the HTML for content in PHP templates) ────────────────

export interface SiteData {
  headline: string;
  subheadline: string;
  intro: string;
  services: { name: string; slug: string; description: string }[];
  offices: { city: string; address: string }[];
  socialLinks: { platform: string; url: string }[];
}

export function getStaticSiteData(): SiteData {
  return {
    headline: 'Conectamos marcas con consumidores a través de experiencias memorables',
    subheadline: 'Captar la atención del consumidor',
    intro:
      'La comunicación evolucionó. Los enfoques de hace diez años ya no funcionan. Necesitamos ideas excepcionales, distintas, entretenidas, emocionantes y audaces. Las experiencias reales se expanden en línea y a través de todos los puntos de contacto.',
    services: [
      {
        name: 'Experiencia de Marca',
        slug: 'experiencia-de-marca',
        description:
          'Creamos experiencias inmersivas que conectan marcas con consumidores de manera auténtica y memorable.',
      },
      {
        name: 'Trade Marketing y Puntos de Venta',
        slug: 'trade-marketing',
        description:
          'Transformamos los puntos de venta en espacios de conexión que impulsan la decisión de compra.',
      },
      {
        name: 'Cartelería Digital',
        slug: 'carteleria',
        description:
          'Soluciones de señalización y comunicación visual que elevan la experiencia en cada espacio.',
      },
    ],
    offices: [
      { city: 'Buenos Aires', address: 'Echeverria 760, Vte. Lopez' },
      { city: 'Mexico City', address: 'Av. Homero 1804, Polanco' },
      { city: 'Madrid', address: "C/ O'donnell N°14" },
      { city: 'Miami', address: '1000 Brickell Ave, Suite 905' },
    ],
    socialLinks: [
      { platform: 'Instagram', url: 'https://www.instagram.com/contenidosadvertising' },
      { platform: 'LinkedIn', url: 'https://www.linkedin.com/company/contenidos-advertising' },
      { platform: 'YouTube', url: 'https://www.youtube.com/contenidosadvertising' },
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
    resumen?:         string;
    subtitulo?:       string;
    mercados?:        string;
    titulo_mercado?:  string;
    post_campana?:    string;  // iframe HTML con el embed de YouTube
    image_carousel?:  { image: { url: string; alt: string } }[] | false;
  };
  _embedded?: {
    'wp:featuredmedia'?: { source_url: string; alt_text: string }[];
    'wp:term'?: { id: number; name: string; slug: string }[][];
  };
}

export async function getCasos(lang = 'es', perPage = 6): Promise<WPCaso[]> {
  return apiFetch<WPCaso[]>(`/casos?lang=${lang}&per_page=${perPage}&_embed`);
}

export async function getAllCasos(lang = 'es'): Promise<WPCaso[]> {
  return apiFetch<WPCaso[]>(`/casos?lang=${lang}&per_page=100&_embed`);
}

export async function getCasoBySlug(slug: string, lang = 'es'): Promise<WPCaso | null> {
  const casos = await apiFetch<WPCaso[]>(`/casos?slug=${slug}&lang=${lang}&_embed`);
  return casos[0] ?? null;
}

export interface CasosPage {
  casos: WPCaso[];
  total: number;
  totalPages: number;
}

export async function getCasosPage(page = 1, perPage = 6, lang = 'es'): Promise<CasosPage> {
  const res = await fetch(
    `${API}/casos?lang=${lang}&per_page=${perPage}&page=${page}&_embed`
  );
  if (!res.ok) throw new Error(`WP API error: ${res.status} /casos`);
  const total = parseInt(res.headers.get('X-WP-Total') ?? '0', 10);
  const totalPages = parseInt(res.headers.get('X-WP-TotalPages') ?? '1', 10);
  const casos = await res.json() as WPCaso[];
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

// ── Clientes (custom post type) ───────────────────────────────────────────────

export interface WPCliente {
  id: number;
  title: { rendered: string };
  _embedded?: {
    'wp:featuredmedia'?: { source_url: string; alt_text: string }[];
  };
}

export async function getClientes(lang = 'es'): Promise<WPCliente[]> {
  return apiFetch<WPCliente[]>(`/clientes?lang=${lang}&per_page=100&_embed`);
}

export function getClienteLogo(cliente: WPCliente): string {
  return cliente._embedded?.['wp:featuredmedia']?.[0]?.source_url ?? '';
}
