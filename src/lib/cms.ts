import { sanityClient } from 'sanity:client';
import { defineQuery } from 'groq';
import { createImageUrlBuilder } from '@sanity/image-url';
import type { PortableTextBlock } from '@portabletext/types';
import { CATEGORIAS_CASO as CATEGORIAS } from '../../studio/schemaTypes/categoriasCaso';

export type Lang = 'es' | 'pt' | 'en';

const builder = createImageUrlBuilder(sanityClient);

interface SanityImageRef {
  asset?: { _ref: string; _id?: string };
  alt?: string;
}

interface LocaleString {
  es?: string;
  pt?: string;
  en?: string;
}

interface LocaleBlocks {
  es?: PortableTextBlock[];
  pt?: PortableTextBlock[];
  en?: PortableTextBlock[];
}

/** Español es el idioma con más contenido siempre cargado — fallback natural cuando falta una traducción. */
function pickLocale(field: LocaleString | undefined, lang: Lang): string {
  return field?.[lang] || field?.es || '';
}

function pickLocaleBlocks(field: LocaleBlocks | undefined, lang: Lang): PortableTextBlock[] | undefined {
  return field?.[lang] ?? field?.es;
}

function imageUrl(image: SanityImageRef | undefined): string {
  if (!image?.asset) return '';
  return builder.image(image).auto('format').url();
}

const SRCSET_WIDTHS = [400, 800, 1200, 1600];

/**
 * srcset con versiones más chicas de la imagen, para que el navegador baje solo
 * el tamaño que necesita. El ancho original viene en el _ref del asset
 * (image-<hash>-<ancho>x<alto>-<ext>); nunca se piden versiones más grandes que el original.
 */
function imageSrcset(image: SanityImageRef | undefined): string | undefined {
  const ref = image?.asset?._ref;
  if (!ref) return undefined;
  const originalWidth = Number(ref.match(/-(\d+)x\d+-\w+$/)?.[1]);
  if (!originalWidth) return undefined;
  const widths = SRCSET_WIDTHS.filter((w) => w < originalWidth);
  if (originalWidth <= SRCSET_WIDTHS[SRCSET_WIDTHS.length - 1]) widths.push(originalWidth);
  return widths
    .map((w) => `${builder.image(image!).width(w).auto('format').url()} ${w}w`)
    .join(', ');
}

// ── Casos ────────────────────────────────────────────────────────────────────

interface CasoDoc {
  _id: string;
  slug: string;
  titulo?: LocaleString;
  subtitulo?: LocaleString;
  resumen?: LocaleString;
  mercado?: LocaleString;
  contenido?: LocaleBlocks;
  imagenDestacada?: SanityImageRef;
  galeria?: SanityImageRef[];
  videoYoutubeId?: string;
  categorias?: string[];
}

export interface Caso {
  id: string;
  slug: string;
  titulo: string;
  subtitulo: string;
  resumen: string;
  mercado: string;
  contenido: PortableTextBlock[] | undefined;
  imagenUrl: string;
  imagenAlt: string;
  /** srcset para <img>; undefined si no se puede calcular (Astro omite el atributo). */
  imagenSrcset?: string;
  galeria: { url: string; srcset?: string; alt: string }[];
  videoYoutubeId: string;
  categorias: string[];
}

const CASO_PROJECTION = /* groq */ `{
  "id": _id,
  "slug": slug.current,
  titulo, subtitulo, resumen, mercado, contenido, videoYoutubeId,
  imagenDestacada, galeria, categorias
}`;

function mapCaso(doc: CasoDoc, lang: Lang): Caso {
  const titulo = pickLocale(doc.titulo, lang);
  return {
    id: doc._id,
    slug: doc.slug,
    titulo,
    subtitulo: pickLocale(doc.subtitulo, lang),
    resumen: pickLocale(doc.resumen, lang),
    mercado: pickLocale(doc.mercado, lang),
    contenido: pickLocaleBlocks(doc.contenido, lang),
    imagenUrl: imageUrl(doc.imagenDestacada),
    imagenAlt: doc.imagenDestacada?.alt || titulo,
    imagenSrcset: imageSrcset(doc.imagenDestacada),
    galeria: (doc.galeria ?? []).map((img) => ({ url: imageUrl(img), srcset: imageSrcset(img), alt: img.alt || titulo })),
    videoYoutubeId: doc.videoYoutubeId ?? '',
    categorias: doc.categorias ?? [],
  };
}

// Categorías de caso: fuente única compartida con el Studio (ver el archivo para cómo agregarlas).
export type { CategoriaCaso } from '../../studio/schemaTypes/categoriasCaso';

/** Valores (slugs) de las categorías de caso, para getStaticPaths. */
export const CATEGORIAS_CASO = CATEGORIAS.map((c) => c.value);

/** Nombre visible de una categoría en el idioma pedido; si no existe, devuelve el slug. */
export function categoriaLabel(categoria: string, lang: Lang): string {
  return CATEGORIAS.find((c) => c.value === categoria)?.title[lang] ?? categoria;
}

// Orden por sourceId de WordPress (desc) como aproximación estable a "más reciente primero":
// los documentos migrados no conservan la fecha original de publicación de WordPress.
const CASOS_QUERY = defineQuery(
  `*[_type == "caso"] | order(migracion.sourceId desc) ${CASO_PROJECTION}`
);

export async function getCasos(lang: Lang = 'es', count?: number): Promise<Caso[]> {
  const docs = await sanityClient.fetch<CasoDoc[]>(CASOS_QUERY);
  const casos = docs.map((d) => mapCaso(d, lang));
  return typeof count === 'number' ? casos.slice(0, count) : casos;
}

export async function getAllCasos(lang: Lang = 'es'): Promise<Caso[]> {
  return getCasos(lang);
}

const CASO_BY_SLUG_QUERY = defineQuery(
  `*[_type == "caso" && slug.current == $slug][0] ${CASO_PROJECTION}`
);

export async function getCasoBySlug(slug: string, lang: Lang = 'es'): Promise<Caso | null> {
  const doc = await sanityClient.fetch<CasoDoc | null>(CASO_BY_SLUG_QUERY, { slug });
  return doc ? mapCaso(doc, lang) : null;
}

/** Casos por página en el listado paginado (/casos, /casos/N). */
export const CASOS_POR_PAGINA = 6;

export interface CasosPage {
  casos: Caso[];
  total: number;
  totalPages: number;
}

const CASOS_PAGE_QUERY = defineQuery(`{
  "total": count(*[_type == "caso"]),
  "items": *[_type == "caso"] | order(migracion.sourceId desc) [$start...$end] ${CASO_PROJECTION}
}`);

export async function getCasosPage(page = 1, perPage = 6, lang: Lang = 'es'): Promise<CasosPage> {
  const start = (page - 1) * perPage;
  const { total, items } = await sanityClient.fetch<{ total: number; items: CasoDoc[] }>(CASOS_PAGE_QUERY, {
    start,
    end: start + perPage,
  });
  return {
    casos: items.map((d) => mapCaso(d, lang)),
    total,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

const CASOS_POR_CATEGORIA_QUERY = defineQuery(
  `*[_type == "caso" && $categoria in categorias] | order(migracion.sourceId desc) ${CASO_PROJECTION}`
);

export async function getCasosPorCategoria(categoria: string, lang: Lang = 'es'): Promise<Caso[]> {
  const docs = await sanityClient.fetch<CasoDoc[]>(CASOS_POR_CATEGORIA_QUERY, { categoria });
  return docs.map((d) => mapCaso(d, lang));
}

// ── Carreras ─────────────────────────────────────────────────────────────────

interface CarreraDoc {
  _id: string;
  slug: string;
  titulo?: LocaleString;
  tipo?: string;
  categoria?: string;
  areaTrabajo?: LocaleString;
  contenido?: LocaleBlocks;
}

export interface Carrera {
  id: string;
  slug: string;
  titulo: string;
  tipo: string;
  categoria: string;
  areaTrabajo: string;
  contenido: PortableTextBlock[] | undefined;
}

const CARRERA_PROJECTION = /* groq */ `{
  "id": _id,
  "slug": slug.current,
  titulo, tipo, categoria, areaTrabajo, contenido
}`;

function mapCarrera(doc: CarreraDoc, lang: Lang): Carrera {
  return {
    id: doc._id,
    slug: doc.slug,
    titulo: pickLocale(doc.titulo, lang),
    tipo: doc.tipo ?? '',
    categoria: doc.categoria ?? '',
    areaTrabajo: pickLocale(doc.areaTrabajo, lang),
    contenido: pickLocaleBlocks(doc.contenido, lang),
  };
}

const CARRERAS_QUERY = defineQuery(`*[_type == "carrera"] | order(migracion.sourceId desc) ${CARRERA_PROJECTION}`);

export async function getCarreras(lang: Lang = 'es'): Promise<Carrera[]> {
  const docs = await sanityClient.fetch<CarreraDoc[]>(CARRERAS_QUERY);
  return docs.map((d) => mapCarrera(d, lang));
}

const CARRERA_BY_SLUG_QUERY = defineQuery(
  `*[_type == "carrera" && slug.current == $slug][0] ${CARRERA_PROJECTION}`
);

export async function getCarreraBySlug(slug: string, lang: Lang = 'es'): Promise<Carrera | null> {
  const doc = await sanityClient.fetch<CarreraDoc | null>(CARRERA_BY_SLUG_QUERY, { slug });
  return doc ? mapCarrera(doc, lang) : null;
}

// ── Clientes (no localizado, ver CLAUDE.md) ───────────────────────────────────

interface ClienteDoc {
  id: string;
  nombre: string;
  logo?: SanityImageRef;
}

export interface Cliente {
  id: string;
  nombre: string;
  logoUrl: string;
}

const CLIENTES_QUERY = defineQuery(`*[_type == "cliente"] | order(nombre asc){ "id": _id, nombre, logo }`);

export async function getClientes(): Promise<Cliente[]> {
  const docs = await sanityClient.fetch<ClienteDoc[]>(CLIENTES_QUERY);
  return docs.map((d) => ({ id: d.id, nombre: d.nombre, logoUrl: imageUrl(d.logo) }));
}

// ── Página Home (page builder) ────────────────────────────────────────────────
// Patrón incremental: hoy solo existe el bloque "hero"; nuevos tipos de bloque se
// suman como un nuevo caso en mapBloque() + su propia interfaz, sin tocar el resto.

interface BloqueDoc {
  _type: string;
  _key: string;
  titulo?: LocaleString;
  mostrarTitulo?: boolean;
  fuenteVideo?: 'incrustado' | 'vimeo' | 'youtube';
  video?: {asset?: {url: string}};
  videoUrl?: string;
  efectoActivo?: boolean;
}

export interface HeroBloque {
  type: 'hero';
  key: string;
  titulo: string;
  mostrarTitulo: boolean;
  fuenteVideo: 'incrustado' | 'vimeo' | 'youtube';
  videoUrl?: string;
  videoEmbedId?: string;
  efectoActivo: boolean;
}

export type BloqueHome = HeroBloque;

function extractVimeoId(url: string): string | undefined {
  return url.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1];
}

function extractYoutubeId(url: string): string | undefined {
  return url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/)?.[1];
}

function mapBloque(doc: BloqueDoc, lang: Lang): BloqueHome | undefined {
  if (doc._type === 'heroBloque') {
    const fuenteVideo = doc.fuenteVideo ?? 'incrustado';
    const videoEmbedId =
      fuenteVideo === 'vimeo' ? extractVimeoId(doc.videoUrl ?? '') :
      fuenteVideo === 'youtube' ? extractYoutubeId(doc.videoUrl ?? '') :
      undefined;
    return {
      type: 'hero',
      key: doc._key,
      titulo: pickLocale(doc.titulo, lang),
      mostrarTitulo: doc.mostrarTitulo ?? true,
      fuenteVideo,
      videoUrl: fuenteVideo === 'incrustado' ? doc.video?.asset?.url : undefined,
      videoEmbedId,
      efectoActivo: fuenteVideo === 'incrustado' ? (doc.efectoActivo ?? true) : false,
    };
  }
  return undefined;
}

export interface PaginaHome {
  bloques: BloqueHome[];
}

const PAGINA_HOME_QUERY = defineQuery(
  `*[_type == "paginaHome" && _id == "paginaHome"][0]{ bloques[]{ _type, _key, titulo, mostrarTitulo, fuenteVideo, video{"asset": asset->{url}}, videoUrl, efectoActivo } }`
);

export async function getPaginaHome(lang: Lang = 'es'): Promise<PaginaHome> {
  const doc = await sanityClient.fetch<{ bloques?: BloqueDoc[] } | null>(PAGINA_HOME_QUERY);
  const bloques = (doc?.bloques ?? [])
    .map((b) => mapBloque(b, lang))
    .filter((b): b is BloqueHome => b !== undefined);
  return { bloques };
}

// ── Configuración de seguimiento (GTM, Search Console, scripts sueltos) ──────

export interface ConfiguracionSeguimiento {
  googleTagManagerId?: string;
  googleSiteVerification?: string;
  scriptsPersonalizados?: string;
  scriptsPersonalizadosBody?: string;
  scriptsPersonalizadosFinBody?: string;
}

const CONFIGURACION_SEGUIMIENTO_QUERY = defineQuery(
  `*[_type == "configuracionSeguimiento" && _id == "configuracionSeguimiento"][0]{ googleTagManagerId, googleSiteVerification, scriptsPersonalizados, scriptsPersonalizadosBody, scriptsPersonalizadosFinBody }`
);

// Layout.astro la pide en cada página: en el build se trae una sola vez y se reutiliza.
// En dev no se cachea, para que un cambio en el Studio se vea al recargar.
let configuracionSeguimientoCache: Promise<ConfiguracionSeguimiento> | undefined;

export function getConfiguracionSeguimiento(): Promise<ConfiguracionSeguimiento> {
  if (import.meta.env.PROD && configuracionSeguimientoCache) return configuracionSeguimientoCache;
  const promise = sanityClient
    .fetch<ConfiguracionSeguimiento | null>(CONFIGURACION_SEGUIMIENTO_QUERY)
    .then((doc) => doc ?? {});
  if (import.meta.env.PROD) configuracionSeguimientoCache = promise;
  return promise;
}
