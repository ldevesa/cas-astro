// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import cloudflare from '@astrojs/cloudflare';
import vercel from '@astrojs/vercel';

// Cloudflare Pages inyecta CF_PAGES=1, Vercel inyecta VERCEL=1
const target = process.env.CF_PAGES ? 'cloudflare'
             : process.env.VERCEL   ? 'vercel'
             : null;

const adapter = target === 'cloudflare' ? cloudflare()
              : target === 'vercel'     ? vercel()
              : undefined;

// https://astro.build/config
export default defineConfig({
  site: 'https://contenidosad.com',
  output: 'static',
  adapter,
  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'pt', 'en'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});